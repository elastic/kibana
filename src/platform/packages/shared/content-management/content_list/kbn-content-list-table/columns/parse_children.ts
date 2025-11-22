/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type { ColumnConfigMap, CustomColumnConfig } from '../types';
import type { SupportsConfig } from './types';
import { getColumnId, isColumnComponent, type ParseColumnProps } from './namespaces';
import { parseNameColumnProps, type NameColumnConfig } from './name';
import { parseUpdatedAtColumnProps, type UpdatedAtColumnConfig } from './updated_at';
import { parseCreatedByColumnProps, type CreatedByColumnConfig } from './created_by';
import { parseActionsColumnProps, type ActionsColumnConfig } from './actions';
import { parseExpanderColumnProps, type ExpanderColumnConfig } from './expander';

/**
 * Union type for all parsed column configurations.
 */
type ParsedColumnConfig =
  | NameColumnConfig
  | UpdatedAtColumnConfig
  | CreatedByColumnConfig
  | ActionsColumnConfig
  | ExpanderColumnConfig
  | CustomColumnConfig;

/**
 * Registry of column parsers for built-in/shared column types.
 * Maps column ID to its specific parser function.
 *
 * Custom columns (using the base `<Column />` component) don't need to be registered here.
 * They are handled by the fallback logic below which passes through their props directly.
 *
 * Only add entries here when creating new shared column types (e.g., `Column.Name`, `Column.UpdatedAt`).
 */
const COLUMN_PARSERS: Record<string, ParseColumnProps<ParsedColumnConfig>> = {
  name: parseNameColumnProps,
  updatedAt: parseUpdatedAtColumnProps,
  createdBy: parseCreatedByColumnProps,
  actions: parseActionsColumnProps,
  expander: parseExpanderColumnProps,
};

/**
 * Build default columns based on supports config.
 *
 * @param supports - Feature support flags from the provider.
 * @returns Array of default column keys.
 */
const buildDefaultColumns = (supports?: SupportsConfig): string[] => {
  const defaultColumns: string[] = ['expander', 'name'];

  // Include `createdBy` column if `userProfiles` is enabled on the provider.
  if (supports?.userProfiles) {
    defaultColumns.push('createdBy');
  }

  defaultColumns.push('updatedAt');
  defaultColumns.push('actions');

  return defaultColumns;
};

/**
 * Parse `Column` components from children.
 *
 * Extracts column configuration from declarative JSX children and builds
 * the column order array and configuration map for {@link buildColumnsFromConfig}.
 *
 * @param children - React children that may contain `Column` components.
 * @param hasChildren - Whether children were provided (`false` means use defaults).
 * @param supports - Feature support flags from the provider.
 * @returns Tuple of `[columns array, column config map]`.
 */
export const parseColumnsFromChildren = (
  children: ReactNode,
  hasChildren: boolean,
  supports?: SupportsConfig
): [string[], ColumnConfigMap<readonly string[]>] => {
  // If no children, return defaults based on supports config.
  if (!hasChildren) {
    return [buildDefaultColumns(supports), {}];
  }

  const columns: string[] = [];
  const columnConfig: Record<string, ParsedColumnConfig> = {};
  const seenIds = new Set<string>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || !isColumnComponent(child)) {
      return;
    }

    const columnId = getColumnId(child);
    if (!columnId) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[ContentListTable] Column component missing id');
      }
      return;
    }

    // Check for duplicate IDs.
    if (seenIds.has(columnId)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[ContentListTable] Duplicate column ID: ${columnId}`);
      }
      return;
    }
    seenIds.add(columnId);

    columns.push(columnId);

    // Use column-specific parser if available (for built-in columns).
    const parser = COLUMN_PARSERS[columnId];
    if (parser) {
      columnConfig[columnId] = parser(child);
    } else {
      // Fallback for custom columns - pass through props directly.
      // This allows consumers to use `<Column id="..." name="..." render={...} />`
      // without any registration or configuration.
      const props = child.props || {};
      columnConfig[columnId] = {
        name: props.name,
        width: props.width,
        sortable: props.sortable,
        render: props.render,
        columnTitle: props.columnTitle,
      };
    }
  });

  // If children were provided but no valid `Column` components were found,
  // fall back to defaults to prevent rendering an empty table.
  if (columns.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[ContentListTable] Children provided but no Column components found. Using defaults.'
      );
    }
    return [buildDefaultColumns(supports), {}];
  }

  return [columns, columnConfig as ColumnConfigMap<readonly string[]>];
};
