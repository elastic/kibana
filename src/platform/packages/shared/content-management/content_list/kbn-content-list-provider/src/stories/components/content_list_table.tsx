/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { MOCK_TAGS } from '@kbn/content-list-mock-data';
import {
  useContentListItems,
  useContentListSelection,
  useContentListConfig,
  useContentListPagination,
  useContentListSort,
  type ContentListItem,
} from '../..';

// -----------------------------------------------------------------------------
// Tag Display Helpers
// -----------------------------------------------------------------------------

/** Map tag IDs to tag metadata for display (name, color). */
const TAG_LOOKUP = new Map(MOCK_TAGS.map((tag) => [tag.id, tag]));

// -----------------------------------------------------------------------------
// Shared Styles
// -----------------------------------------------------------------------------

const centeredPanelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 300,
  width: '100%',
};

// -----------------------------------------------------------------------------
// Main Table Component
// -----------------------------------------------------------------------------

/**
 * Table component demonstrating provider data display capabilities.
 *
 * This component shows how to use the provider's hooks:
 * - `useContentListItems()` - Items, loading state, errors
 * - `useContentListSelection()` - Selected items and selection handlers
 * - `useContentListPagination()` - Page index, size, and setters
 * - `useContentListSort()` - Sort field, direction, and setters
 * - `useContentListConfig()` - Feature flags and entity names
 *
 * The table adapts its columns and features based on provider configuration.
 */
export const ContentListTable: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Provider Hooks
  // ---------------------------------------------------------------------------

  // Get items and loading state.
  const { items, totalItems, isLoading, error } = useContentListItems();

  // Get selection state (for bulk actions).
  const { selectedItems, setSelection, isSelected } = useContentListSelection();

  // Get pagination state.
  const { index: pageIndex, size: pageSize, setPage } = useContentListPagination();

  // Get sort state.
  const { field: sortField, direction: sortDirection, setSort } = useContentListSort();

  // Get configuration to check feature flags.
  const config = useContentListConfig();

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  const isSortingEnabled = config.features.sorting !== false;
  const isPaginationEnabled = config.features.pagination !== false;
  const isSelectionEnabled = config.features.selection !== undefined && !config.isReadOnly;

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /** Handle table pagination and sort changes. */
  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<ContentListItem>) => {
      if (page) {
        setPage(page.index, page.size);
      }
      // Only update sort if it actually changed - SET_SORT resets page to 0.
      if (
        sort &&
        isSortingEnabled &&
        (sort.field !== sortField || sort.direction !== sortDirection)
      ) {
        setSort(sort.field as string, sort.direction);
      }
    },
    [setPage, setSort, isSortingEnabled, sortField, sortDirection]
  );

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading && items.length === 0) {
    return (
      <EuiPanel hasShadow={false} hasBorder style={centeredPanelStyle}>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={<h3>Loading {config.entityNamePlural}...</h3>}
        />
      </EuiPanel>
    );
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <EuiPanel hasShadow={false} hasBorder style={centeredPanelStyle}>
        <EuiCallOut announceOnMount title="Error loading items" color="danger" iconType="error">
          <EuiText>{error.message}</EuiText>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty State
  // ---------------------------------------------------------------------------

  if (items.length === 0) {
    return (
      <EuiPanel hasShadow={false} hasBorder style={centeredPanelStyle}>
        <EuiEmptyPrompt
          iconType="tableDensityNormal"
          title={<h3>No {config.entityNamePlural} found</h3>}
          body={<EuiText color="subdued">Try adjusting your search or filters.</EuiText>}
        />
      </EuiPanel>
    );
  }

  // ---------------------------------------------------------------------------
  // Column Definitions
  // ---------------------------------------------------------------------------

  const columns: Array<EuiBasicTableColumn<ContentListItem>> = [
    // Starred indicator (only if starred feature is enabled).
    ...(config.supports.starred
      ? [
          {
            field: 'favorite',
            name: '',
            width: '32px',
            render: (isFavorite: boolean | undefined) => (
              <EuiIcon
                type={isFavorite ? 'starFilled' : 'starEmpty'}
                color={isFavorite ? 'warning' : 'subdued'}
              />
            ),
          } as EuiBasicTableColumn<ContentListItem>,
        ]
      : []),

    // Title column (always shown, sortable if enabled).
    {
      field: 'title',
      name: 'Title',
      sortable: isSortingEnabled,
      render: (title: string) => (
        <EuiText>
          <strong>{title}</strong>
        </EuiText>
      ),
    },

    // Description column.
    {
      field: 'description',
      name: 'Description',
      render: (description: string | undefined) =>
        description ? (
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        ) : null,
    },

    // Tags column (only if tags service is configured).
    ...(config.supports.tags
      ? [
          {
            field: 'tags',
            name: 'Tags',
            render: (tags: string[] | undefined) =>
              tags?.length ? (
                <EuiFlexGroup gutterSize="xs" wrap>
                  {tags.map((tagId) => {
                    const tagInfo = TAG_LOOKUP.get(tagId);
                    return (
                      <EuiFlexItem key={tagId} grow={false}>
                        <EuiBadge color={tagInfo?.color ?? 'hollow'}>
                          {tagInfo?.name ?? tagId}
                        </EuiBadge>
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              ) : null,
          } as EuiBasicTableColumn<ContentListItem>,
        ]
      : []),

    // Updated date column (sortable if enabled).
    {
      field: 'updatedAt',
      name: 'Updated',
      sortable: isSortingEnabled,
      render: (date: Date | undefined) =>
        date ? (
          <EuiText size="s" color="subdued">
            {date.toLocaleDateString()}
          </EuiText>
        ) : null,
    },
  ];

  // ---------------------------------------------------------------------------
  // Selection Configuration
  // ---------------------------------------------------------------------------

  const selection = isSelectionEnabled
    ? {
        onSelectionChange: (selected: ContentListItem[]) =>
          setSelection(new Set(selected.map((item) => item.id))),
        selected: items.filter((item) => isSelected(item.id)),
      }
    : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Selection callout. */}
      {selectedItems.size > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            title={`${selectedItems.size} ${
              selectedItems.size === 1 ? config.entityName : config.entityNamePlural
            } selected`}
            iconType="check"
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {/* Main table. */}
      <EuiPanel hasShadow={false} hasBorder>
        {/* @ts-expect-error - EuiBasicTable union type doesn't accept undefined for conditional props. */}
        <EuiBasicTable<ContentListItem>
          tableCaption="Content List Table"
          items={items}
          itemId="id"
          columns={columns}
          selection={isSelectionEnabled ? selection : undefined}
          sorting={
            isSortingEnabled ? { sort: { field: sortField, direction: sortDirection } } : undefined
          }
          pagination={
            isPaginationEnabled
              ? {
                  pageIndex,
                  pageSize,
                  totalItemCount: totalItems,
                  pageSizeOptions: [5, 10, 20, 50],
                }
              : undefined
          }
          onChange={onTableChange}
          loading={isLoading}
        />
      </EuiPanel>
    </>
  );
};
