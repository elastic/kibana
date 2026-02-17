/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { table } from '../assembly';
import type { ColumnBuilderContext } from './types';
import type { NameColumnProps } from './name/name_builder';
import type { UpdatedAtColumnProps } from './updated_at/updated_at_builder';

/**
 * Props for the `Column` component (custom columns).
 *
 * Custom columns are identified by `props.id` and provide their own
 * `render` function. Pre-built columns (like `Column.Name`) have
 * dedicated preset components with their own props interfaces.
 */
export interface ColumnProps {
  /** Unique identifier for the column. */
  id: string;
  /** Display name for the column header. */
  name: ReactNode;
  /** Column width (CSS value like `'200px'` or `'40%'`). */
  width?: string;
  /** Whether the column is sortable. */
  sortable?: boolean;
  /**
   * Optional field name to use for sorting and/or value lookup.
   *
   * Defaults to the column `id` when omitted.
   */
  field?: string;
  /** Optional test subject for the column header/cells. */
  'data-test-subj'?: string;
  /** Render function for the column cells. */
  render: (item: ContentListItem) => ReactNode;
}

/**
 * Namespace interface for `Column` sub-components.
 *
 * The base `Column` accepts {@link ColumnProps}; pre-built columns
 * are properties (e.g., `Column.Name`).
 */
export interface ColumnNamespace {
  (props: ColumnProps): ReactNode;
  Name: (props: NameColumnProps) => ReactNode;
  UpdatedAt: (props: UpdatedAtColumnProps) => ReactNode;
}

/** Preset-to-props mapping for table columns. */
export interface ColumnPresets {
  name: NameColumnProps;
  updatedAt: UpdatedAtColumnProps;
}

/** Part factory for table columns. */
export const column = table.definePart<
  ColumnPresets,
  EuiBasicTableColumn<ContentListItem>,
  ColumnBuilderContext
>({ name: 'column' });

/**
 * Build an `EuiBasicTableColumn` from a custom (non-preset) column.
 *
 * Registered as the fallback resolver via `createComponent({ resolve })`.
 * Custom columns are identified by `props.id` rather than a preset name.
 */
const resolveCustomColumn = (
  { id, name, width, sortable, field, render, 'data-test-subj': dataTestSubj }: ColumnProps,
  { supports }: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> => {
  const fieldId = field ?? id;
  const supportsSorting = supports?.sorting ?? true;

  return {
    name,
    field: fieldId,
    sortable: supportsSorting ? sortable : false,
    ...(width && { width }),
    render: (_value: unknown, record: ContentListItem) => render(record),
    'data-test-subj': dataTestSubj ?? `content-list-table-column-${id}`,
  };
};

/**
 * Column component for custom columns.
 *
 * This is a declarative component that doesn't render anything.
 * It's used to specify column configuration as React children.
 * Pre-built columns are available as properties: `Column.Name`, etc.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column
 *     id="status"
 *     name="Status"
 *     width="120px"
 *     render={(item) => {
 *       const status = item.status ?? 'draft';
 *       return <EuiBadge>{status}</EuiBadge>;
 *     }}
 *   />
 * </ContentListTable>
 * ```
 */
export const Column = column.createComponent<ColumnProps>({
  resolve: resolveCustomColumn,
});
