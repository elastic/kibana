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
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import { i18nTexts } from '../i18n_texts';
import { useFilePickerContext } from '../context';

interface Props {
  error: Error;
}

export const ErrorContent: FunctionComponent<Props> = ({ error }) => {
  const { state } = useFilePickerContext();
  const isLoading = useBehaviorSubject(state.isLoading$);
  return (
    <EuiEmptyPrompt
      data-test-subj="errorPrompt"
      iconType="warning"
      iconColor="danger"
      titleSize="xs"
      title={<h3>{i18nTexts.loadingFilesErrorTitle}</h3>}
      body={error.message}
      actions={
        <EuiButton disabled={isLoading} onClick={state.retry}>
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      }
    />
  );
};
