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
import { CreatedByCell } from './created_by_cell';

/**
 * Props for CreatedBy column component.
 * Uses BaseColumnProps with component-specific render function signature.
 * This is the source of truth for CreatedBy column configuration.
 */
export type CreatedByColumnProps = BaseColumnProps<{
  /**
   * Custom render function with additional user parameter
   */
  render?: (item: ContentListItem, user?: string) => ReactNode;
}>;

/**
 * Internal config type used by the builder after parsing.
 */
export interface CreatedByColumnConfig {
  columnTitle?: string;
  width?: string;
  render?: (item: ContentListItem, user?: string) => ReactNode;
}

/**
 * Parse CreatedBy column props from a React element.
 *
 * @param element - React element representing the `CreatedByColumn` component.
 * @returns Parsed {@link CreatedByColumnConfig} object.
 */
export const parseProps = (element: ReactElement): CreatedByColumnConfig => {
  const props = element.props || {};

  return {
    columnTitle: props.columnTitle,
    width: props.width,
    render: props.render,
  };
};

/**
 * Build the Created By column with smart defaults.
 */
export const buildColumn: ColumnBuilder<SupportedColumnsConfig['createdBy']> = (
  config,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | null => {
  // If explicitly set to false, don't render.
  if (config === false) {
    return null;
  }

  const customConfig = typeof config === 'object' ? config : {};

  // Determine sortability from sortableFields config.
  // Fall back to false since createdBy is not sortable by default (uid-based).
  const sortable = context.sortableFields?.includes('createdBy') ?? false;

  return {
    field: 'createdBy',
    name: customConfig.columnTitle ?? 'Creator',
    sortable,
    width: customConfig.width ?? '24px',
    align: 'center',
    'data-test-subj': 'content-list-table-column-created-by',
    render: (createdBy: string | undefined, item: ContentListItem) => {
      // Use custom render if provided.
      if (customConfig.render) {
        return customConfig.render(item, createdBy);
      }

      // Default: render using cell component with avatar.
      // Note: `item.managed` comes from generic T extension and needs type assertion.
      const managed = typeof item.managed === 'boolean' ? item.managed : undefined;
      return <CreatedByCell uid={createdBy} managed={managed} entityName={context.entityName} />;
    },
  };
};
