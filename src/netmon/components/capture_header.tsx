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
import { EuiButton, EuiButtonIcon, EuiPopover } from '@elastic/eui';
import SelectedCaptureSessions from '@logrhythm/nm-web-shared/services/selected_capture_sessions';
import { startPcapDownload } from '@logrhythm/nm-web-shared/services/session_files';
import { toastNotifications } from 'ui/notify';
import FileDownloadModal from './file_download/file_download_modal';

const useStyles = createUseStyles({
  popoverWrapper: {
    marginRight: '2px',
  },
  popoverPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    '& button': {
      width: '100%',
    },
    '& button + button': {
      marginTop: '5px',
    },
  },
});

export interface CaptureHeaderProps {
  onSelectAll?: () => void;
  onSelectCurrentPage?: () => void;
}

const CaptureHeader = (props: CaptureHeaderProps) => {
  const { onSelectAll, onSelectCurrentPage } = props;

  const classes = useStyles();

  const [open, setOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [downloadId, setDownloadId] = useState('');

  useEffect(() => {
    const unsub = SelectedCaptureSessions.subscribeAll(sessions => {
      setSelectedCount(sessions.length);
    });

    return () => {
      unsub();
      // if we are unmounting the header,
      // we should clear our list
      SelectedCaptureSessions.reset();
    };
  }, []);

  const button = (
    <EuiButtonIcon
      color="primary"
      iconType="boxesVertical"
      aria-label="Select Sessions To Capture"
      onClick={() => setOpen(o => !o)}
    />
  );

  const handleStartDownload = async () => {
    try {
      if (SelectedCaptureSessions.count() === 0) {
        return;
      }

      const sessions = SelectedCaptureSessions.getAll();

      const startDownloadRes = await startPcapDownload(sessions);

      setDownloadId(startDownloadRes.data.downloadID);
      SelectedCaptureSessions.reset();
    } catch (err) {
      console.error('An error occurred creating a PCAP download for selected sessions', err);  // eslint-disable-line
      toastNotifications.addDanger('An error initiating a download for the PCAP(s).');
      return;
    }
  };

  return (
    <>
      <EuiPopover
        id="capture_header_popover"
        className={classes.popoverWrapper}
        isOpen={open}
        button={button}
        ownFocus
        closePopover={() => setOpen(false)}
      >
        <div className={classes.popoverPanel}>
          <EuiButton
            color="secondary"
            disabled={selectedCount === 0}
            onClick={() => {
              handleStartDownload();
              setOpen(false);
            }}
          >
            Download Selected Sessions
          </EuiButton>
          <EuiButton
            disabled={!onSelectAll}
            onClick={() => {
              if (!onSelectAll) {
                return;
              }
              onSelectAll();
              setOpen(false);
            }}
          >
            Select All Sessions
          </EuiButton>
          <EuiButton
            disabled={!onSelectCurrentPage}
            onClick={() => {
              if (!onSelectCurrentPage) {
                return;
              }
              onSelectCurrentPage();
              setOpen(false);
            }}
          >
            Select Sessions on Current Page
          </EuiButton>
          <EuiButton
            color="danger"
            disabled={selectedCount === 0}
            onClick={() => {
              SelectedCaptureSessions.reset();
              setOpen(false);
            }}
          >
            Clear Selected Sessions
          </EuiButton>
        </div>
      </EuiPopover>
      <small>{selectedCount} selected</small>
      <FileDownloadModal
        downloadId={downloadId}
        fileType="pcap"
        onClose={() => setDownloadId('')}
      />
    </>
  );
};

export default CaptureHeader; // eslint-disable-line
