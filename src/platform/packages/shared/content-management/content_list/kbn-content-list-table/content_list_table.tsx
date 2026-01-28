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
import {
  useContentListItems,
  useContentListConfig,
  useSortableFields,
  useOpenContentEditor,
  type ContentListItem,
} from '@kbn/content-list-provider';
import {
  buildColumnsFromConfig,
  parseColumnsFromChildren,
  Column as BaseColumn,
  NameColumn,
  UpdatedAtColumn,
  CreatedByColumn,
  ActionsColumn,
  ExpanderColumn,
  ViewDetailsAction,
  EditAction,
  DeleteAction,
  DuplicateAction,
  ExportAction,
  CustomAction as BaseCustomAction,
  type ColumnNamespace,
  type ActionNamespace,
} from './columns';
import type { ColumnBuilderContext, ExpanderContext } from './columns/types';
import { useSelection, useSorting, useIsTableEmpty, useExpandableRows, getRowId } from './hooks';

/**
 * Props for ContentListTable component
 */
export interface ContentListTableProps {
  /**
   * Accessible title for the table (used as table caption for screen readers)
   */
  title: string;

  /**
   * Function to render expandable row details.
   * Only called for actually expanded rows (lazy evaluation for performance).
   */
  renderDetails?: (item: ContentListItem) => ReactNode;

  /**
   * Optional predicate to determine if a row can be expanded.
   * If not provided and renderDetails is set, all rows are expandable by default.
   *
   * Use this for performance when determining expandability is cheaper than
   * calling renderDetails. For example, if renderDetails does expensive computation
   * or data fetching, provide a canExpand predicate that checks a simple property.
   *
   * @example canExpand={(item) => item.hasDetails === true}
   */
  canExpand?: (item: ContentListItem) => boolean;

  /**
   * Table layout mode
   */
  tableLayout?: 'fixed' | 'auto';

  /**
   * Compressed table style
   */
  compressed?: boolean;

  /**
   * Custom empty state component
   * If not provided, auto-detects variant based on state
   */
  emptyState?: ReactNode;

  /**
   * Column components as children
   * If no children provided, defaults to Name, UpdatedAt, and Action columns
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

  /**
   * Test subject for testing
   */
  'data-test-subj'?: string;
}

/**
 * ContentListTable - Table renderer for content listings
 *
 * Integrates with EUI's EuiBasicTable and ContentListProvider for state management.
 * Supports configurable columns via compound components, row selection, row actions, and empty states.
 *
 * @example Basic usage (defaults to Name, UpdatedAt, and Action columns)
 * ```tsx
 * <ContentListProvider {...config}>
 *   <ContentListTable title="Dashboards" />
 * </ContentListProvider>
 * ```
 *
 * @example Custom columns and actions
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable title="My Dashboards">
 *   <Column.Name width="40%" />
 *   <Column<{ status?: string }>
 *     id="status"
 *     name="Status"
 *     render={(item) => <Badge>{item.status}</Badge>}
 *   />
 *   <Column.UpdatedAt />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action id="share" label="Share" iconType="share" handler={handleShare} />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
const ContentListTableComponent = ({
  title,
  renderDetails,
  canExpand,
  tableLayout = 'auto',
  compressed = false,
  emptyState: customEmptyState,
  children,
  filter,
  'data-test-subj': dataTestSubj = 'content-list-table',
}: ContentListTableProps) => {
  const { items: rawItems, isLoading: loading, error } = useContentListItems();
  const items = useMemo(() => (filter ? rawItems.filter(filter) : rawItems), [rawItems, filter]);
  const { item: itemConfig, isReadOnly, entityName, supports } = useContentListConfig();
  const sortableFields = useSortableFields();
  // Get the auto-wired content editor action (returns undefined if not configured).
  const contentEditorAction = useOpenContentEditor();

  // Determine if a local filter is applied (used to pass filtered items to hooks).
  const hasLocalFilter = filter !== undefined;
  const hookOptions = useMemo(
    () => (hasLocalFilter ? { filteredItems: items } : undefined),
    [hasLocalFilter, items]
  );

  // Parse columns from children (with defaults if no children)
  // Supports config determines default columns (e.g., createdBy when userProfiles is enabled)
  const [columns, columnConfig] = useMemo(
    () => parseColumnsFromChildren(children, !!children, supports),
    [children, supports]
  );

  // Hooks for table configuration - pass filtered items when a local filter is applied.
  const selection = useSelection(hookOptions);
  const { sorting, onChange } = useSorting();
  const [isTableEmpty, emptyStateComponent] = useIsTableEmpty(hookOptions);
  const {
    itemIdToExpandedRowMap,
    toggleRowExpanded,
    hasExpandableContent,
    isRowExpanded,
    hasAnyExpandableContent,
  } = useExpandableRows(renderDetails, canExpand, hookOptions);

  // Memoize expander context to reduce dependency array size in tableColumns.
  const expanderContext: ExpanderContext | undefined = useMemo(
    () =>
      renderDetails
        ? { hasExpandableContent, isRowExpanded, toggleRowExpanded, hasAnyExpandableContent }
        : undefined,
    [renderDetails, hasExpandableContent, isRowExpanded, toggleRowExpanded, hasAnyExpandableContent]
  );

  // Build columns from parsed configuration.
  // Supports config affects column rendering (e.g., tags/favorites in name cell).
  // Expander context is passed when `renderDetails` is provided.
  // contentEditorAction enables auto-wired "View details" action when features.contentEditor is configured.
  const tableColumns = useMemo(() => {
    const context: ColumnBuilderContext = {
      itemConfig,
      isReadOnly,
      sortableFields,
      entityName,
      supports,
      expander: expanderContext,
      contentEditorAction,
    };
    return buildColumnsFromConfig(columns, columnConfig, context);
  }, [
    columns,
    columnConfig,
    itemConfig,
    isReadOnly,
    sortableFields,
    entityName,
    supports,
    expanderContext,
    contentEditorAction,
  ]);

  // Render empty state if table is empty.
  if (isTableEmpty) {
    // Use custom empty state if provided, otherwise use auto-detected.
    return <>{customEmptyState ?? emptyStateComponent}</>;
  }

  // Render table.
  return (
    <EuiBasicTable
      tableCaption={title}
      columns={tableColumns}
      compressed={compressed}
      error={error?.message}
      itemId={(item) => getRowId(item.id)}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      items={items}
      loading={loading}
      onChange={onChange}
      selection={selection}
      sorting={sorting}
      tableLayout={tableLayout}
      data-test-subj={dataTestSubj}
    />
  );
};

// Create Column namespace with sub-components - type-safe construction
export const Column: ColumnNamespace = Object.assign(BaseColumn, {
  Name: NameColumn,
  UpdatedAt: UpdatedAtColumn,
  CreatedBy: CreatedByColumn,
  Actions: ActionsColumn,
  Expander: ExpanderColumn,
});

// Create Action namespace with sub-components - type-safe construction
export const Action: ActionNamespace = Object.assign(BaseCustomAction, {
  ViewDetails: ViewDetailsAction,
  Edit: EditAction,
  Delete: DeleteAction,
  Duplicate: DuplicateAction,
  Export: ExportAction,
});

export const ContentListTable = Object.assign(ContentListTableComponent, {
  Column,
  Action,
});
