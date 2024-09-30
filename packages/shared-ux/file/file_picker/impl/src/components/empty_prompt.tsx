/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { useFilePickerContext } from '../context';
import { i18nTexts } from '../i18n_texts';

interface Props {
  kind: string;
  multiple: boolean;
}

export const EmptyPrompt: FunctionComponent<Props> = ({ kind, multiple }) => {
  const { state, uploadMeta } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  return (
    <EuiEmptyPrompt
      data-test-subj="emptyPrompt"
      title={<h3>{i18nTexts.emptyStatePrompt}</h3>}
      titleSize="s"
      actions={[
        <FileUpload
          css={css`
            min-width: calc(${euiTheme.size.xxxl} * 6);
          `}
          meta={uploadMeta as Record<string, unknown>}
          kind={kind}
          immediate
          multiple={multiple}
          onDone={(file) => {
            state.selectFile(file.map(({ fileJSON }) => fileJSON));
            state.retry();
          }}
        />,
      ]}
    />
  );
};
