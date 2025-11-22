/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { SupportedColumnsConfig } from '../../types';
import type { ColumnBuilder, ColumnBuilderContext } from '../types';
import type { BaseColumnProps } from '../namespaces';
import { UpdatedAtCell } from './updated_at_cell';

/**
 * Props for UpdatedAt column component.
 * Uses BaseColumnProps with component-specific render function signature.
 * This is the source of truth for UpdatedAt column configuration.
 */
export type UpdatedAtColumnProps = BaseColumnProps<{
  /**
   * Custom render function with additional date parameter
   */
  render?: (item: ContentListItem, date?: Date) => ReactNode;
}>;

/**
 * Internal config type used by the builder after parsing.
 */
export interface UpdatedAtColumnConfig {
  columnTitle?: string;
  width?: string;
  render?: (item: ContentListItem, date?: Date) => ReactNode;
}

/**
 * Parse UpdatedAt column props from a React element.
 *
 * @param element - React element representing the `UpdatedAtColumn` component.
 * @returns Parsed {@link UpdatedAtColumnConfig} object.
 */
export const parseProps = (element: ReactElement): UpdatedAtColumnConfig => {
  const props = element.props || {};

  return {
    columnTitle: props.columnTitle,
    width: props.width,
    render: props.render,
  };
};

/**
 * Build the Updated At column with smart defaults.
 */
export const buildColumn: ColumnBuilder<SupportedColumnsConfig['updatedAt']> = (
  config,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | null => {
  // If explicitly set to false, don't render.
  if (config === false) {
    return null;
  }

  const customConfig = typeof config === 'object' ? config : {};

  // Determine sortability from sortableFields config.
  // Fall back to true if no sortableFields config (backwards compatibility).
  const sortable = context.sortableFields?.includes('updatedAt') ?? true;

  return {
    field: 'updatedAt',
    name: customConfig.columnTitle ?? 'Last updated',
    sortable,
    width: customConfig.width ?? '100px',
    'data-test-subj': 'content-list-table-column-updated-at',
    render: (updatedAt: Date | undefined, item: ContentListItem) => {
      // Use custom render if provided.
      if (customConfig.render) {
        return customConfig.render(item, updatedAt);
      }

      // Default: render relative time using cell component.
      return <UpdatedAtCell date={updatedAt} />;
    },
  };
};
