/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { useEuiTheme, EuiEmptyPrompt } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';

import { i18nTexts } from '../i18n_texts';
import { useFilePickerContext } from '../context';
import { FileCard } from './file_card';

export const FileGrid: FunctionComponent = () => {
  const { state } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const files = useObservable(state.files$, []);
  if (!files.length) {
    return <EuiEmptyPrompt title={<h3>{i18nTexts.emptyFileGridPrompt}</h3>} titleSize="s" />;
  }
  return (
    <div
      data-test-subj="fileGrid"
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(calc(${euiTheme.size.xxxxl} * 3), 1fr));
        gap: ${euiTheme.size.m};
      `}
    >
      {files.map((file, idx) => (
        <FileCard key={idx} file={file} />
      ))}
    </div>
  );
};
