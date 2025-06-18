/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, PropsWithChildren } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useDropzone } from 'react-dropzone';

export const FileDropzone: FC<PropsWithChildren> = ({ children }) => {
  const onFilesSelected = (files: File[]) => {
    console.log(files, '___files___');
  };

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
