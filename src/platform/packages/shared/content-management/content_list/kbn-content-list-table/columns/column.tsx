/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Props for the Column component (generic for custom fields)
 * @template T Custom fields type to extend ContentListItem
 */
export interface ColumnProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Unique identifier for the column
   */
  id: string;

  /**
   * Display name for the column header
   */
  name: string;

  /**
   * Column width (CSS value like '200px' or '30%')
   */
  width?: string;

  /**
   * Whether the column is sortable
   */
  sortable?: boolean;

  /**
   * Render function for the column cells.
   * The item is typed as ContentListItem<T> where T is your custom fields type.
   */
  render: (item: ContentListItem<T>) => ReactNode;
}

/**
 * Column component for custom columns with generic type support.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify column configuration as React children.
 *
 * Pre-built columns are available as properties: Column.Name, Column.UpdatedAt, etc.
 *
 * @template T Custom fields type to extend ContentListItem
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * // Define your custom data type
 * type MyCustomData = { status?: 'active' | 'draft' | 'archived' };
 *
 * <ContentListTable>
 *   {/* Pre-built columns *}
 *   <Column.Name />
 *   <Column.UpdatedAt />
 *
 *   {/* Custom column with type safety *}
 *   <Column<MyCustomData>
 *     id="status"
 *     name="Status"
 *     width="120px"
 *     render={(item) => {
 *       // item.status is typed as 'active' | 'draft' | 'archived' | undefined
 *       const status = item.status ?? 'draft';
 *       return <EuiBadge>{status}</EuiBadge>;
 *     }}
 *   />
 * </ContentListTable>
 * ```
 */
const Column = <T extends Record<string, unknown> = Record<string, unknown>>(
  _props: ColumnProps<T>
): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(Column as { __kbnContentListTableRole?: string }).__kbnContentListTableRole = 'column';
Column.displayName = 'Column';

export { Column };
