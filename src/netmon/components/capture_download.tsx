/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { EuiButtonIcon, EuiCheckbox } from '@elastic/eui';
import SelectedCaptureSessions from '@logrhythm/nm-web-shared/services/selected_capture_sessions';
import { startPcapDownload } from '@logrhythm/nm-web-shared/services/session_files';
import { toastNotifications } from 'ui/notify';
import FileDownloadModal from './file_download/file_download_modal';

const useStyles = makeStyles({
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
