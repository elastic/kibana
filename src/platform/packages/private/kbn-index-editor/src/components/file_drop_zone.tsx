/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingSpinner, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import React, { PropsWithChildren, useCallback, type FC } from 'react';
import { useDropzone } from 'react-dropzone';
import { FormattedMessage } from '@kbn/i18n-react';
import { FilesPreview } from './file_preview';

export const FileDropzone: FC<PropsWithChildren> = ({ children }) => {
  const { fileUploadManager, filesStatus, uploadStatus } = useFileUploadContext();

  const isAnalyzing =
    uploadStatus.analysisStatus === STATUS.STARTED &&
    uploadStatus.overallImportStatus === STATUS.NOT_STARTED;

  const isUploading = uploadStatus.overallImportStatus === STATUS.STARTED;

  const onFilesSelected = useCallback(
    async (files: File[]) => {
      if (files && files.length > 0) {
        await fileUploadManager.addFiles(files);
      }
    },
    [fileUploadManager]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      onFilesSelected(acceptedFiles);
    },
    accept: ['.csv'],
    multiple: true,
    noClick: true, // we'll trigger open manually
    noKeyboard: true,
  });

  const { euiTheme } = useEuiTheme();

  const overlayBase = css({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: transparentize(euiTheme.colors.backgroundLightText, 0.75),
    zIndex: 1000,
  });

  const overlayDraggingFile = css({
    ...overlayBase,
    zIndex: 1001,
    borderRadius: euiTheme.border.radius.small,
    cursor: 'grabbing',
    border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.primary}`,
  });

  const loadingIndicator = (
    <div css={{ ...overlayBase, zIndex: 1002 }}>
      <div
        css={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          translate: '-50% -50%',
          textAlign: 'center',
        }}
      >
        <EuiLoadingSpinner size="xl" />
        <div>
          {isAnalyzing ? (
            <FormattedMessage
              id="indexEditor.fileUpload.analyzingIndicator"
              defaultMessage={'Analyzing...'}
            />
          ) : null}
          {isUploading ? (
            <FormattedMessage
              id="indexEditor.fileUpload.uploadingIndicator"
              defaultMessage={'Uploading...'}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  const showFilePreview =
    !isDragActive &&
    filesStatus.length > 0 &&
    uploadStatus.overallImportStatus !== STATUS.COMPLETED;

  const content = showFilePreview ? <FilesPreview /> : children;

  return (
    <div {...getRootProps()}>
      {isDragActive ? <div css={overlayDraggingFile} /> : null}
      {isUploading || isAnalyzing ? loadingIndicator : null}
      <input {...getInputProps()} />
      {content}
    </div>
  );
};
