/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
}

const AttachDownload = (props: AttachDownloadProps) => {
  const { session, fileName } = props;

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
