/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { EuiButtonIcon } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { startAttachmentDownload } from '@logrhythm/nm-web-shared/services/session_files';
import FileDownloadModal from './file_download/file_download_modal';

const useStyles = makeStyles({
  buttonWrapper: {
    cursor: 'pointer',
  },
});

export interface AttachDownloadProps {
  session: string;
  fileName: string;
  captured: boolean;
}

const AttachDownload = (props: AttachDownloadProps) => {
  const { session, fileName, captured } = props;

  const classes = useStyles();

  const [downloadId, setDownloadId] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);

  useEffect(
    () => {
      const newFileNames = new Set<string>();

      fileName
        .split(',')
        .map(f => f.trim())
        .forEach(file => {
          let fileNameToAdd: string = file;

          const prefix: number = 1;
          while (newFileNames.has(fileNameToAdd)) {
            fileNameToAdd = `${prefix}_${file}`;
          }

          newFileNames.add(fileNameToAdd);
        });

      setFileNames(Array.from(newFileNames));
    },
    [fileName]
  );

  const handleStartDownload = async () => {
    try {
      const startDownloadRes = await startAttachmentDownload(session, fileNames);

      setDownloadId(startDownloadRes.data.downloadID);
    } catch (err) {
      console.error( // eslint-disable-line
        `An error occurred creating an attachment download for session ${session}`,
        err
      );
      toastNotifications.addDanger('An error initiating a download for the attachment(s).');
      return;
    }
  };

  if (!captured) {
    return fileName;
  }

  return (
    <>
      <div className={classes.buttonWrapper}>
        <EuiButtonIcon
          disabled={fileNames.length === 0}
          iconType="importAction"
          color="primary"
          onClick={handleStartDownload}
          aria-label="Download Attachment"
        />
      </div>
      <FileDownloadModal
        downloadId={downloadId}
        fileType="reconstruction"
        onClose={() => setDownloadId('')}
      />
    </>
  );
};

export default AttachDownload; // eslint-disable-line
