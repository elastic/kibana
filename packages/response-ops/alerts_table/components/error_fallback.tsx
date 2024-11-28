/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiCode, EuiCopy, EuiEmptyPrompt } from '@elastic/eui';
import { FallbackComponent } from './error_boundary';
import {
  ALERTS_TABLE_UNKNOWN_ERROR_COPY_TO_CLIPBOARD_LABEL,
  ALERTS_TABLE_UNKNOWN_ERROR_MESSAGE,
  ALERTS_TABLE_UNKNOWN_ERROR_TITLE,
} from '../translations';

export const ErrorFallback: FallbackComponent = ({ error }) => {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={<h2>{ALERTS_TABLE_UNKNOWN_ERROR_TITLE}</h2>}
      body={
        <>
          <p>{ALERTS_TABLE_UNKNOWN_ERROR_MESSAGE}</p>
          {error.message && <EuiCode>{error.message}</EuiCode>}
        </>
      }
      actions={
        <EuiCopy textToCopy={[error.message, error.stack].filter(Boolean).join('\n')}>
          {(copy) => (
            <EuiButton onClick={copy} color="danger" fill>
              {ALERTS_TABLE_UNKNOWN_ERROR_COPY_TO_CLIPBOARD_LABEL}
            </EuiButton>
          )}
        </EuiCopy>
      }
    />
  );
};
