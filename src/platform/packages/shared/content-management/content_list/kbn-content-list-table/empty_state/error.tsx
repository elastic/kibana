/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ErrorEmptyStateProps } from './types';

// Re-export the type for convenience.
export type { ErrorEmptyStateProps } from './types';

/**
 * Empty state component displayed when an error occurs loading items.
 *
 * Shows the error message and provides a retry action if available.
 *
 * @param props - Component props.
 * @param props.entityNamePlural - The plural name of the entity type (e.g., "dashboards").
 * @param props.onRetry - Optional handler to retry the failed operation.
 * @param props.error - The error object containing the error message.
 */
export const ErrorEmptyState = ({
  entityNamePlural,
  onRetry,
  error,
  'data-test-subj': dataTestSubj = 'content-list-empty-state-error',
}: ErrorEmptyStateProps) => {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <h2>
          <FormattedMessage
            id="contentListTable.emptyState.error.title"
            defaultMessage="Unable to load {entityNamePlural}"
            values={{ entityNamePlural }}
          />
        </h2>
      }
      body={<p>{error?.message ?? 'An unexpected error occurred.'}</p>}
      actions={
        onRetry ? (
          <EuiButton
            iconType="refresh"
            onClick={onRetry}
            data-test-subj="content-list-empty-retry-button"
          >
            <FormattedMessage
              id="contentListTable.emptyState.error.retryButton"
              defaultMessage="Retry"
            />
          </EuiButton>
        ) : undefined
      }
      data-test-subj={dataTestSubj}
    />
  );
};
