/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { FailureReason, LoadingStatus } from '../../angular/context_app_state';

export interface ContextErrorMessageProps {
  /**
   * the status of the loading action
   */
  status: string;
  /**
   * the reason of the error
   */
  reason?: string;
}

export function ContextErrorMessage({ status, reason }: ContextErrorMessageProps) {
  if (status !== LoadingStatus.FAILED) {
    return null;
  }
  return (
    <I18nProvider>
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.context.failedToLoadAnchorDocumentDescription"
            defaultMessage="Failed to load the anchor document"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="contextErrorMessageTitle"
      >
        <EuiText data-test-subj="contextErrorMessageBody">
          {reason === FailureReason.UNKNOWN && (
            <FormattedMessage
              id="discover.context.reloadPageDescription.reloadOrVisitTextMessage"
              defaultMessage="Please reload or go back to the document list to select a valid anchor document."
            />
          )}
        </EuiText>
      </EuiCallOut>
    </I18nProvider>
  );
}
