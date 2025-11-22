/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NoResultsEmptyStateProps } from './types';

// Re-export the type for convenience.
export type { NoResultsEmptyStateProps } from './types';

/**
 * Empty state component displayed when search or filters return no results.
 *
 * Provides actions to clear search and/or filters to help users find content.
 *
 * @param props - Component props.
 * @param props.entityNamePlural - The plural name of the entity type (e.g., "dashboards").
 * @param props.onClearFilters - Optional handler to clear active filters.
 * @param props.onClearSearch - Optional handler to clear the search query.
 * @param props.hasActiveFilters - Whether any filters are currently active.
 * @param props.hasSearch - Whether a search query is currently active.
 */
export const NoResultsEmptyState = ({
  entityNamePlural,
  onClearFilters,
  onClearSearch,
  hasActiveFilters,
  hasSearch,
  'data-test-subj': dataTestSubj = 'content-list-empty-state-no-results',
}: NoResultsEmptyStateProps) => {
  const hasActions =
    (hasSearch && onClearSearch !== undefined) ||
    (hasActiveFilters && onClearFilters !== undefined);

  return (
    <EuiEmptyPrompt
      iconType="search"
      title={
        <h2>
          <FormattedMessage
            id="contentListTable.emptyState.noResults.title"
            defaultMessage="No {entityNamePlural} found"
            values={{ entityNamePlural }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="contentListTable.emptyState.noResults.body"
            defaultMessage="Try adjusting your search or filters."
          />
        </p>
      }
      actions={
        hasActions ? (
          <EuiFlexGroup gutterSize="s" justifyContent="center" responsive={false} wrap={false}>
            {hasSearch && onClearSearch && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="eraser"
                  onClick={onClearSearch}
                  data-test-subj="content-list-empty-clear-search-button"
                >
                  <FormattedMessage
                    id="contentListTable.emptyState.noResults.clearSearchButton"
                    defaultMessage="Clear search"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {hasActiveFilters && onClearFilters && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={onClearFilters}
                  data-test-subj="content-list-empty-clear-filters-button"
                >
                  <FormattedMessage
                    id="contentListTable.emptyState.noResults.clearFiltersButton"
                    defaultMessage="Clear filters"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : undefined
      }
      data-test-subj={dataTestSubj}
    />
  );
};
