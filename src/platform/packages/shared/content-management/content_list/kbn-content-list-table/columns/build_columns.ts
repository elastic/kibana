/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type {
  KnownColumnKey,
  ColumnConfigMap,
  CustomColumnConfig,
  NameColumnConfig,
  UpdatedAtColumnConfig,
  CreatedByColumnConfig,
  ActionsColumnConfig,
  ExpanderColumnConfig,
} from '../types';
import type { ColumnBuilder, ColumnBuilderContext } from './types';
import { buildNameColumn } from './name';
import { buildUpdatedAtColumn } from './updated_at';
import { buildCreatedByColumn } from './created_by';
import { buildActionsColumn } from './actions';
import { buildExpanderColumn } from './expander';
import { createSafeRender } from './safe_render';

/**
 * Union type for all known column configurations.
 */
type KnownColumnConfig =
  | boolean
  | NameColumnConfig
  | UpdatedAtColumnConfig
  | CreatedByColumnConfig
  | ActionsColumnConfig
  | ExpanderColumnConfig;

/**
 * Build columns from configuration array and config map.
 *
 * Takes a list of column keys (determining order) and a configuration map,
 * then builds the corresponding `EuiBasicTableColumn` array for rendering.
 *
 * @param columns - Array of column keys specifying order.
 * @param columnConfig - Configuration map for columns (see {@link ColumnConfigMap}).
 * @param context - Builder context with `itemConfig` and `isReadOnly`.
 * @returns Array of `EuiBasicTableColumn<ContentListItem>` objects.
 */
export const buildColumnsFromConfig = <TColumns extends readonly string[]>(
  columns: TColumns,
  columnConfig: ColumnConfigMap<TColumns> | undefined,
  context: ColumnBuilderContext
): Array<EuiBasicTableColumn<ContentListItem>> => {
  const result: Array<EuiBasicTableColumn<ContentListItem>> = [];

  const builders: Record<KnownColumnKey, ColumnBuilder> = {
    name: buildNameColumn,
    updatedAt: buildUpdatedAtColumn,
    createdBy: buildCreatedByColumn,
    actions: buildActionsColumn,
    expander: buildExpanderColumn,
  };

  for (const columnKey of columns) {
    if (columnKey in builders) {
      // Known column.
      const config = columnConfig?.[columnKey as keyof typeof columnConfig] ?? true;
      if (config !== false) {
        const column = builders[columnKey as KnownColumnKey](config, context);
        if (column) {
          result.push(column);
        }
      }
    } else {
      // Custom column.
      const config = columnConfig?.[columnKey as keyof typeof columnConfig];

      if (!config || typeof config === 'boolean') {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            `[ContentListTable] Unknown column "${columnKey}" without config. ` +
              `Provide columnConfig.${columnKey} or remove from columns array.`
          );
        }
        continue;
      }

      // Build custom column from config.
      // The render function comes from Column<T> which expects (item: ContentListItem<T>) => ReactNode.
      const customConfig = config as CustomColumnConfig & {
        'data-test-subj'?: string;
        sortable?: boolean;
        field?: string;
        render?: (item: ContentListItem) => React.ReactNode;
        columnTitle?: string;
      };

      // Destructure `columnTitle` (custom prop) from rest (EUI-compatible props).
      // `columnTitle` is used for the column header name, not passed to DOM.
      const { columnTitle, ...restConfig } = customConfig;

      // Determine the field for sorting (defaults to column id).
      const fieldId = restConfig.field ?? columnKey;

      // Determine sortability:
      // 1. If explicitly set via `sortable` prop, use that.
      // 2. Otherwise, check if the column's field/id is in `sortableFields`.
      let sortable = restConfig.sortable;
      if (sortable === undefined && context.sortableFields) {
        sortable = context.sortableFields.includes(fieldId);
      }

      // Wrap render function to match `EuiBasicTable`'s (value, record) signature.
      // Our `Column` render expects just (item), so we pass the record (second arg).
      // Precompute the safe render wrapper once per column for stable allocation.
      const safeRender = restConfig.render
        ? createSafeRender(restConfig.render, columnKey)
        : undefined;
      const wrappedRender = safeRender
        ? (_value: unknown, record: ContentListItem) => safeRender(record)
        : undefined;

      result.push({
        ...restConfig,
        name: columnTitle ?? restConfig.name, // Use columnTitle for header if provided.
        field: fieldId, // Required for EuiBasicTable sort indicator.
        sortable,
        render: wrappedRender,
        'data-test-subj': restConfig['data-test-subj'] ?? `content-list-table-column-${columnKey}`,
      } as EuiBasicTableColumn<ContentListItem>);
    }
  }

  return result;
};
