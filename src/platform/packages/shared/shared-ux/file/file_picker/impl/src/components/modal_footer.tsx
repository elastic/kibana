/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiModalFooter } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';
import { FileUpload } from '@kbn/shared-ux-file-upload';

import type { Props as FilePickerProps } from '../file_picker';
import { useFilePickerContext } from '../context';
import { i18nTexts } from '../i18n_texts';
import { Pagination } from './pagination';
import { SelectButton, Props as SelectButtonProps } from './select_button';

interface Props {
  kind: string;
  onDone: SelectButtonProps['onClick'];
  onUpload?: FilePickerProps['onUpload'];
  multiple: boolean;
}

export const ModalFooter: FunctionComponent<Props> = ({ kind, onDone, onUpload, multiple }) => {
  const { state, uploadMeta } = useFilePickerContext();
  const onUploadStart = useCallback(() => state.setIsUploading(true), [state]);
  const onUploadEnd = useCallback(() => state.setIsUploading(false), [state]);
  return (
    <EuiModalFooter>
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          width: 100%;
        `}
      >
        <div
          css={css`
            place-self: stretch;
          `}
        >
          <FileUpload
            onDone={(n) => {
              state.selectFile(n.map(({ fileJSON }) => fileJSON));
              state.resetFilters();
              onUpload?.(n);
            }}
            meta={uploadMeta as Record<string, unknown>}
            onUploadStart={onUploadStart}
            onUploadEnd={onUploadEnd}
            kind={kind}
            initialPromptText={i18nTexts.uploadFilePlaceholderText}
            multiple={multiple}
            compressed
          />
        </div>
        <div
          css={css`
            place-self: center;
          `}
        >
          <Pagination />
        </div>
        <div
          css={css`
            place-self: end;
          `}
        >
          <SelectButton onClick={onDone} />
        </div>
      </div>
    </EuiModalFooter>
  );
};
