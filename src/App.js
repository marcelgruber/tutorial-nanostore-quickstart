import React, { useState, useRef } from 'react'
import { Typography, Button, TextField } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { createAction } from '@babbage/sdk'
import { toast } from 'react-toastify'
import { invoice, upload } from 'nanostore-publisher'
import { Img } from 'uhrp-react'
import { download } from 'nanoseek'

const useStyles = makeStyles(theme => ({
  content_wrap: {
    display: 'grid',
    placeItems: 'center',
    width: '100%',
    minHeight: '100vh'
  },
  action_button: {
    marginBottom: theme.spacing(3)
  },
  image: {
    width: '10em'
  }
}), { name: 'App' })

const App = () => {
  const [loading, setLoading] = useState(false)
  const [uploadedURL, setUploadedURL] = useState('')
  const [enteredURL, setEnteredURL] = useState('')
  const classes = useStyles()
  const fileRef = useRef()

  const handleSubmit = async e => {
    try {
      e.preventDefault()
      setLoading(true)

      if (
        !fileRef.current ||
        !fileRef.current.files ||
        fileRef.current.files.length !== 1
      ) {
        throw new Error('Please upload a single image file!')
      }

      const inv = await invoice({
        fileSize: fileRef.current.files[0].size,
        retentionPeriod: 525600 * 5 // five years
      })

      const action = await createAction({
        description: 'Upload an image',
        keyName: 'primarySigning',
        keyPath: 'm/1033/1',
        outputs: inv.outputs.map(x => ({
          satoshis: x.amount,
          script: x.outputScript
        }))
      }, false)
      const response = await upload({
        referenceNumber: inv.referenceNumber,
        transactionHex: action.rawTransaction,
        file: fileRef.current.files[0]
      })
      if (!response.published) {
        throw new Error(response.description || 'The file failed to upload!')
      }
      setUploadedURL(response.hash)
    } catch (e) {
      console.error('Uh oh! Looks like something went wrong...')
      console.error(e)
      if (e.response && e.response.data && e.response.data.description) {
        toast.error(e.response.data.description)
      } else {
        toast.error(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    const { mimeType, data } = await download({ URL: enteredURL })
    const blob = new Blob([data], { type: mimeType })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `image.${mimeType.split('/')[1]}`
    link.click()
  }

  return (
    <div className={classes.content_wrap}>
      <Typography variant='h3' align='center'>
        NanoStore Image Uploader & Viewer
      </Typography>
      <form onSubmit={handleSubmit}>
        <input
          type='file'
          accept='image/png, image/gif, image/jpeg'
          ref={fileRef}
        />
        <br />
        <br />
        <Button
          className={classes.action_button}
          variant='contained'
          color='primary'
          size='large'
          type='submit'
          disabled={loading}
        >
          Upload Image
        </Button>
        <br />
        <br />
        {uploadedURL && (
          <Typography><b>URL:</b>{' '}{uploadedURL}</Typography>
        )}
      </form>
      <div>
        <Typography variant='h5' align='center'>View or Download</Typography>
        <TextField
          onChange={e => setEnteredURL(e.target.value)}
          value={enteredURL}
          variant='outlined'
          fullWidth
          placeholder='Enter UHRP URL...'
        />
        <br />
        <br />
        <Img
          src={enteredURL}
          className={classes.image}
        />
        <br />
        <br />
        <Button
          disabled={!enteredURL}
          onClick={handleDownload}
        >
          Download Image
        </Button>
      </div>
    </div>
  )
}

export default App
