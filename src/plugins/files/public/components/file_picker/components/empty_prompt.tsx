/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import { UploadFile } from '../../upload_file';
import { useFilePickerContext } from '../context';
import { i18nTexts } from '../i18n_texts';

interface Props {
  kind: string;
  multiple: boolean;
}

export const EmptyPrompt: FunctionComponent<Props> = ({ kind, multiple }) => {
  const { state } = useFilePickerContext();
  return (
    <EuiEmptyPrompt
      data-test-subj="emptyPrompt"
      title={<h3>{i18nTexts.emptyStatePrompt}</h3>}
      titleSize="s"
      actions={[
        // TODO: We can remove this once the entire modal is an upload area
        <UploadFile
          kind={kind}
          immediate
          multiple={multiple}
          onDone={(file) => {
            state.selectFile(file.map(({ id }) => id));
            state.retry();
          }}
        />,
      ]}
    />
  );
};
