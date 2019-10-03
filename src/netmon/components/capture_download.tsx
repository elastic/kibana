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

import React, { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { EuiButtonIcon, EuiCheckbox } from '@elastic/eui';
import SelectedCaptureSessions from '@logrhythm/nm-web-shared/services/selected_capture_sessions';
import { startPcapDownload } from '@logrhythm/nm-web-shared/services/session_files';
import { toastNotifications } from 'ui/notify';
import FileDownloadModal from './file_download/file_download_modal';

const useStyles = createUseStyles({
  contentWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  buttonWrapper: {
    cursor: 'pointer',
  },
});

export interface AttachDownloadProps {
  session: string;
}

const CaptureDownload = (props: AttachDownloadProps) => {
  const { session } = props;

  const classes = useStyles();

  const [downloadId, setDownloadId] = useState('');
  const [isSelected, setIsSelected] = useState(false);

  useEffect(
    () => {
      return SelectedCaptureSessions.subscribe(session, setIsSelected);
    },
    [session]
  );

  const handleStartDownload = async () => {
    try {
      const sessions = !SelectedCaptureSessions.isEmpty()
        ? SelectedCaptureSessions.getAll()
        : [session];

      const startDownloadRes = await startPcapDownload(sessions);

      setDownloadId(startDownloadRes.data.downloadID);
      SelectedCaptureSessions.reset();
    } catch (err) {
      console.error(`An error occurred creating a PCAP download for session ${session}`, err); // eslint-disable-line
      toastNotifications.addDanger('An error initiating a download for the PCAP(s).');
      return;
    }
  };

  return (
    <>
      <div className={classes.contentWrapper}>
        <div className={classes.buttonWrapper}>
          <EuiButtonIcon
            iconType="importAction"
            color="primary"
            onClick={handleStartDownload}
            aria-label="Download PCAPs"
          />
        </div>
        <EuiCheckbox
          id={`download_session_${session}`}
          checked={isSelected}
          onChange={e => {
            const action = e.target.checked
              ? SelectedCaptureSessions.add
              : SelectedCaptureSessions.remove;
            action(session);
          }}
        />
      </div>
      <FileDownloadModal
        downloadId={downloadId}
        fileType="pcap"
        onClose={() => setDownloadId('')}
      />
    </>
  );
};

export default CaptureDownload; // eslint-disable-line
