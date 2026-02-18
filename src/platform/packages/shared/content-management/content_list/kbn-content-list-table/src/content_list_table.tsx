/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { useContentListItems, type ContentListItem } from '@kbn/content-list-provider';
import { Column as BaseColumn, NameColumn, UpdatedAtColumn } from './column';
import { useColumns, useSorting } from './hooks';
import { EmptyState } from './empty_state';

/**
 * Props for ContentListTable component.
 */
export interface ContentListTableProps {
  /** Accessible title for the table (used as table caption for screen readers). */
  title: string;
  /** Table layout mode. */
  tableLayout?: 'fixed' | 'auto';
  /** Compressed table style. */
  compressed?: boolean;
  /**
   * Custom empty state component.
   * If not provided, uses default empty state.
   */
  emptyState?: ReactNode;
  /**
   * Column components as children.
   * If no children provided, defaults to Name column.
   */
  children?: ReactNode;
  /**
   * Optional filter function to filter items from the provider.
   * Useful when multiple tables share a single provider but display different subsets.
   *
   * **Important:** This function should be memoized (e.g., with `useCallback`) to prevent
   * unnecessary re-filtering on every render.
   *
   * @example
   * ```tsx
   * const filter = useCallback(
   *   (item: ContentListItem) => item.type === 'dashboard',
   *   []
   * );
   * <ContentListTable filter={filter} />
   * ```
   */
  filter?: (item: ContentListItem) => boolean;
  /** Test subject for testing. */
  'data-test-subj'?: string;
}

/**
 * Get a stable row ID for EuiBasicTable's `itemId` prop.
 *
 * @param id - The item's ID.
 * @returns A stable row ID string.
 */
export const getRowId = (id: string): string => `content-list-table-row-${id}`;

/**
 * ContentListTable - Table renderer for content listings.
 *
 * Integrates with EUI's EuiBasicTable and ContentListProvider for state management.
 * Supports configurable columns via compound components, and empty states.
 *
 * @example Basic usage (defaults to Name column)
 * ```tsx
 * <ContentListProvider {...config}>
 *   <ContentListTable title="Dashboards" />
 * </ContentListProvider>
 * ```
 *
 * @example Custom columns
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable title="My Dashboards">
 *   <Column.Name width="40%" />
 *   <Column
 *     id="status"
 *     name="Status"
 *     render={(item) => <Badge>{item.status}</Badge>}
 *   />
 * </ContentListTable>
 * ```
 */
const ContentListTableComponent = ({
  title,
  tableLayout = 'auto',
  compressed = false,
  emptyState: customEmptyState,
  children,
  filter,
  'data-test-subj': dataTestSubj = 'content-list-table',
}: ContentListTableProps) => {
  const { items: rawItems, isLoading: loading, error } = useContentListItems();
  const items = useMemo(() => (filter ? rawItems.filter(filter) : rawItems), [rawItems, filter]);

  const columns = useColumns(children);
  const { sorting, onChange } = useSorting();

  const isTableEmpty = !loading && !error && items.length === 0;

  if (isTableEmpty) {
    // TODO: Move this to the `ContentList` component, once it exists, as a part.
    return <>{customEmptyState ?? <EmptyState />}</>;
  }

  return (
    <EuiBasicTable
      tableCaption={title}
      columns={columns}
      compressed={compressed}
      error={error?.message}
      itemId={(item) => getRowId(item.id)}
      items={items}
      loading={loading}
      onChange={onChange}
      sorting={sorting}
      tableLayout={tableLayout}
      data-test-subj={dataTestSubj}
    />
  );
};

// Create Column namespace with sub-components.
export const Column = Object.assign(BaseColumn, {
  Name: NameColumn,
  UpdatedAt: UpdatedAtColumn,
});

export const ContentListTable = Object.assign(ContentListTableComponent, {
  Column,
});
