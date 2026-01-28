/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
} from '@kbn/content-list-provider';

import { ContentListCard } from './content_list_card';
import type { ContentListGridProps } from './types';

/**
 * Checks if a filter value is considered "active" (non-empty/non-null).
 */
const hasFilterValue = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value instanceof Set || value instanceof Map) {
    return value.size > 0;
  }
  if (value instanceof Date) {
    return true;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasFilterValue);
  }
  return true;
};

/**
 * Checks if any filter in the filters object has an active value.
 */
const hasActiveFilterValues = (filters: Record<string, unknown> | undefined): boolean => {
  return Object.values(filters ?? {}).some(hasFilterValue);
};

/**
 * Loading state component with skeleton cards.
 */
const LoadingState: FC = () => {
  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: 200 }}
      data-test-subj="contentListGridLoading"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Error empty state component.
 */
const ErrorState: FC<{ entityNamePlural: string; onRetry?: () => void }> = ({
  entityNamePlural,
  onRetry,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="warning"
      color="danger"
      title={
        <h2>
          <FormattedMessage
            id="contentListGrid.emptyState.error.title"
            defaultMessage="Error loading {entityNamePlural}"
            values={{ entityNamePlural }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="contentListGrid.emptyState.error.body"
            defaultMessage="There was an error loading your {entityNamePlural}. Please try again."
            values={{ entityNamePlural }}
          />
        </p>
      }
      actions={
        onRetry ? (
          <EuiButton iconType="refresh" onClick={onRetry}>
            <FormattedMessage id="contentListGrid.emptyState.error.retry" defaultMessage="Retry" />
          </EuiButton>
        ) : undefined
      }
      data-test-subj="contentListGridError"
    />
  );
};

/**
 * No results empty state component.
 */
const NoResultsState: FC<{
  entityNamePlural: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}> = ({ entityNamePlural, onClearSearch, onClearFilters }) => {
  return (
    <EuiEmptyPrompt
      iconType="search"
      title={
        <h2>
          <FormattedMessage
            id="contentListGrid.emptyState.noResults.title"
            defaultMessage="No {entityNamePlural} found"
            values={{ entityNamePlural }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="contentListGrid.emptyState.noResults.body"
            defaultMessage="Try adjusting your search or filters."
          />
        </p>
      }
      actions={
        <EuiFlexGroup gutterSize="s" justifyContent="center">
          {onClearSearch && (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={onClearSearch}>
                <FormattedMessage
                  id="contentListGrid.emptyState.noResults.clearSearch"
                  defaultMessage="Clear search"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
          {onClearFilters && (
            <EuiFlexItem grow={false}>
              <EuiButton onClick={onClearFilters}>
                <FormattedMessage
                  id="contentListGrid.emptyState.noResults.clearFilters"
                  defaultMessage="Clear filters"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      data-test-subj="contentListGridNoResults"
    />
  );
};

/**
 * No items empty state component.
 */
const NoItemsState: FC<{ entityName: string; onCreate?: () => void }> = ({
  entityName,
  onCreate,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="documents"
      title={
        <h2>
          <FormattedMessage
            id="contentListGrid.emptyState.noItems.title"
            defaultMessage="Create your first {entityName}"
            values={{ entityName }}
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="contentListGrid.emptyState.noItems.body"
            defaultMessage="Get started by creating a new {entityName}."
            values={{ entityName }}
          />
        </p>
      }
      actions={
        onCreate ? (
          <EuiButton iconType="plusInCircle" fill onClick={onCreate}>
            <FormattedMessage
              id="contentListGrid.emptyState.noItems.create"
              defaultMessage="Create {entityName}"
              values={{ entityName }}
            />
          </EuiButton>
        ) : undefined
      }
      data-test-subj="contentListGridNoItems"
    />
  );
};

/**
 * A grid component for displaying content items in a card layout.
 *
 * Integrates with `ContentListProvider` to access items, loading state, and actions.
 * Uses `EuiFlexGroup` with wrap for responsive card layout.
 *
 * @example
 * ```tsx
 * <ContentListProvider {...providerProps}>
 *   <ContentListGrid iconType="dashboardApp" />
 * </ContentListProvider>
 * ```
 */
export const ContentListGrid: FC<ContentListGridProps> = ({
  title,
  iconType = 'document',
  renderCard,
  'data-test-subj': dataTestSubj = 'contentListGrid',
}) => {
  const { entityName, entityNamePlural, supports, features } = useContentListConfig();
  const { items, isLoading, error, refetch } = useContentListItems();
  const { queryText, clearSearch } = useContentListSearch();
  const { filters, clearFilters } = useContentListFilters();

  const hasSearch = queryText.trim().length > 0;
  const hasActiveFilters = useMemo(() => hasActiveFilterValues(filters), [filters]);

  // Determine if grid is empty.
  const hasUserFiltering = hasSearch || hasActiveFilters;
  const isGridEmpty = items.length === 0 && (hasUserFiltering || !isLoading);

  // Show loading state.
  if (isLoading && items.length === 0 && !hasUserFiltering) {
    return <LoadingState />;
  }

  // Show error state.
  if (error && items.length === 0) {
    return <ErrorState entityNamePlural={entityNamePlural} onRetry={refetch} />;
  }

  // Show empty states.
  if (isGridEmpty) {
    if (hasSearch || hasActiveFilters) {
      return (
        <NoResultsState
          entityNamePlural={entityNamePlural}
          onClearSearch={hasSearch ? clearSearch : undefined}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      );
    }
    return <NoItemsState entityName={entityName} onCreate={features.globalActions?.onCreate} />;
  }

  // Render card grid.
  return (
    <EuiFlexGroup
      gutterSize="l"
      wrap
      responsive={false}
      aria-label={title}
      data-test-subj={dataTestSubj}
    >
      {items.map((item) => (
        <EuiFlexItem key={item.id} grow={false}>
          {renderCard ? (
            renderCard(item, {
              onClick: undefined, // Custom renderer handles its own actions.
              getHref: undefined,
            })
          ) : (
            <ContentListCard
              item={item}
              iconType={iconType}
              showTags={supports.tags}
              showStarred={supports.starred}
              data-test-subj={`contentListCard-${item.id}`}
            />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
