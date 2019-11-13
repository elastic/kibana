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

import React from 'react';
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
        <span className={classes.fileDownloadText}>{renderFileName()}</span>
        <span className={classes.fileDownloadProgress}>{renderFileStatus()}</span>
      </div>
      <EuiHorizontalRule />
    </React.Fragment>
  );
};

export default FileDownloadRow; // eslint-disable-line
