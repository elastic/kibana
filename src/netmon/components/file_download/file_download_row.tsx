/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React from 'react';
import classnames from 'classnames';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash';
import { EuiHorizontalRule, EuiIcon, EuiProgress, EuiTextColor, EuiToolTip } from '@elastic/eui';
// @ts-ignore
import { saveAs } from '@elastic/filesaver';
import { SingleFileStatus, DownloadStatus } from '@logrhythm/nm-web-shared/services/session_files';

const useStyles = makeStyles({
  fileDownloadItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltip: {
    cursor: 'pointer',
  },
  infoIcon: {
    marginLeft: '2px',
  },
  fileDownloadText: {
    width: '337.5px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileDownloadProgress: {
    width: '237.5px',
    marginLeft: '25px',
  },
  progressOngoingText: {
    marginBottom: '1em',
  },
  progressText: {
    display: 'flex',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: '12px',
  },
});

export interface FileDownloadRowProps {
  overallStatus: DownloadStatus;
  fileName: string;
  fileStatus: SingleFileStatus;
}

const FileDownloadRow = (props: FileDownloadRowProps) => {
  const { overallStatus, fileName, fileStatus } = props;

  const classes = useStyles();

  const renderFileName = () => (
    <EuiTextColor color={fileStatus.status === 'failure' ? 'danger' : 'default'}>
      {fileName.length < 42 && fileName}
      {fileName.length >= 42 && (
        <EuiToolTip content={fileName}>
          <div className={classes.tooltip}>{`${fileName.substr(0, 38)}...`}</div>
        </EuiToolTip>
      )}
    </EuiTextColor>
  );

  const renderFileStatus = () => {
    switch (fileStatus.status) {
      case 'locating':
      case 'waiting':
      case 'downloading':
        return overallStatus !== 'loading' ? (
          <EuiProgress value={0} max={100} size="xs" color="primary" />
        ) : (
          <>
            <div className={classes.progressOngoingText}>
              {fileStatus.status === 'locating' && 'Locating'}
              {fileStatus.status === 'waiting' && 'Waiting'}
              {fileStatus.status === 'downloading' &&
                typeof fileStatus.message === 'number' &&
                `${fileStatus.message} Bytes Downloaded`}
              {fileStatus.status === 'downloading' &&
                typeof fileStatus.message !== 'number' &&
                'Downloading'}
            </div>
            <EuiProgress size="xs" color="primary" />
          </>
        );
      case 'success':
      case 'failure':
        return (
          <EuiTextColor
            className={classes.progressText}
            color={fileStatus.status === 'failure' ? 'danger' : 'default'}
          >
            <EuiIcon
              className={classes.statusIcon}
              type={fileStatus.status === 'success' ? 'check' : 'cross'}
            />
            {fileStatus.status === 'success' && <div>Success</div>}
            {fileStatus.status === 'failure' && (
              <EuiToolTip content={fileStatus.message}>
                <div className={classes.tooltip}>
                  Error
                  <EuiIcon className={classes.infoIcon} type="iInCircle" />
                </div>
              </EuiToolTip>
            )}
          </EuiTextColor>
        );
    }
  };

  return (
    <React.Fragment>
      <div className={classes.fileDownloadItem}>
        <span className={classnames(classes.fileDownloadText, 'fileDownloadText')}>
          {renderFileName()}
        </span>
        <span className={classes.fileDownloadProgress}>{renderFileStatus()}</span>
      </div>
      <EuiHorizontalRule />
    </React.Fragment>
  );
};

export default FileDownloadRow; // eslint-disable-line
