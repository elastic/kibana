/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { EuiButton, EuiButtonIcon, EuiPopover } from '@elastic/eui';
import SelectedCaptureSessions from '@logrhythm/nm-web-shared/services/selected_capture_sessions';
import { startPcapDownload } from '@logrhythm/nm-web-shared/services/session_files';
import { toastNotifications } from 'ui/notify';
import FileDownloadModal from './file_download/file_download_modal';

const useStyles = makeStyles({
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
