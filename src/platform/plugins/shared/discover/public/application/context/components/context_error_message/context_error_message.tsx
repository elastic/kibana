/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { LoadingStatusEntry } from '../../services/context_query_state';
import { FailureReason, LoadingStatus } from '../../services/context_query_state';

export interface ContextErrorMessageProps {
  /**
   * the status of the loading action
   */
  status: LoadingStatusEntry;
}

export function ContextErrorMessage({ status }: ContextErrorMessageProps) {
  if (status.value !== LoadingStatus.FAILED) {
    return null;
  }
  return (
    <KbnDangerCallout
      title={
        <FormattedMessage
          id="discover.context.failedToLoadAnchorDocumentDescription"
          defaultMessage="Failed to load the anchor document"
        />
      }
      text={
        status.reason === FailureReason.UNKNOWN && (
          <FormattedMessage
            id="discover.context.reloadPageDescription.reloadOrVisitTextMessage"
            defaultMessage="Please reload or go back to the document list to select a valid anchor document."
          />
        )
      }
      data-test-subj="contextErrorMessageTitle"
    />
  );
}
