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
import type { NoItemsEmptyStateProps } from './types';

// Re-export the type for convenience.
export type { NoItemsEmptyStateProps } from './types';

/**
 * Empty state component displayed when no items exist in the collection.
 *
 * Typically shown for first-time use scenarios, encouraging users to create their first item.
 *
 * @param props - Component props.
 * @param props.entityName - The singular name of the entity type (e.g., "dashboard").
 * @param props.onCreate - Optional handler to create a new item.
 */
export const NoItemsEmptyState = ({
  entityName,
  onCreate,
  'data-test-subj': dataTestSubj = 'content-list-empty-state-no-items',
}: NoItemsEmptyStateProps) => {
  return (
    <EuiEmptyPrompt
      iconType="documents"
      title={
        <h2>
          <FormattedMessage
            id="contentListTable.emptyState.noItems.title"
            defaultMessage="Create your first {entityName}"
            values={{ entityName }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="contentListTable.emptyState.noItems.body"
            defaultMessage="Get started by creating a new {entityName}."
            values={{ entityName }}
          />
        </p>
      }
      actions={
        onCreate ? (
          <EuiButton
            iconType="plusInCircle"
            fill
            onClick={onCreate}
            data-test-subj="content-list-empty-create-button"
          >
            <FormattedMessage
              id="contentListTable.emptyState.noItems.createButton"
              defaultMessage="Create {entityName}"
              values={{ entityName }}
            />
          </EuiButton>
        ) : undefined
      }
      data-test-subj={dataTestSubj}
    />
  );
};
