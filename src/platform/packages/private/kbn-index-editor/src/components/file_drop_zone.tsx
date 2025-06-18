/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFileUploadContext } from '@kbn/file-upload';
import React, { PropsWithChildren, useCallback, type FC } from 'react';
import { useDropzone } from 'react-dropzone';

export const FileDropzone: FC<PropsWithChildren> = ({ children }) => {
  const {
    fileUploadManager,
    filesStatus,
    uploadStatus,
    fileClashes,
    fullFileUpload,
    uploadStarted,
    onImportClick,
    canImport,
    setIndexName,
    setIndexValidationStatus,
    deleteFile,
  } = useFileUploadContext();

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

  const overlayCss = css({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: euiTheme.colors.backgroundLightText,
    zIndex: 9999999999,
    borderRadius: euiTheme.border.radius.small,
    cursor: 'grabbing',
    border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.primary}`,
  });

  return (
    <div {...getRootProps()}>
      {isDragActive ? <div css={overlayCss} /> : null}
      <input {...getInputProps()} />
      {children}
    </div>
  );
};
