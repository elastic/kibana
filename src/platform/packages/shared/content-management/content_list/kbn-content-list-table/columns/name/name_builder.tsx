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
import { NameCell } from './name_cell';

/**
 * Props for Name column component.
 * This is the source of truth for Name column configuration.
 */
export type NameColumnProps = BaseColumnProps<{
  /**
   * Whether the column is sortable
   * @default true
   */
  sortable?: boolean;

  /**
   * Whether to show the description
   * @default true
   */
  showDescription?: boolean;

  /**
   * Whether to show tags
   * @default true (when tags is enabled on the provider)
   */
  showTags?: boolean;

  /**
   * Whether to show the starred button.
   * @default true (when starred is enabled on the provider)
   */
  showStarred?: boolean;

  /**
   * Custom render function (overrides default rendering)
   */
  render?: (item: ContentListItem) => ReactNode;
}>;

/**
 * Internal config type used by the builder after parsing.
 * Contains the parsed props in a format the builder can consume.
 */
export interface NameColumnConfig {
  columnTitle?: string;
  width?: string;
  sortable?: boolean;
  render?: (item: ContentListItem) => ReactNode;
  showDescription?: boolean;
  showTags?: boolean;
  showStarred?: boolean;
}

/**
 * Parse Name column props from a React element.
 *
 * This function encapsulates the logic for extracting and transforming
 * the column's props into a format the builder can use.
 *
 * @param element - React element representing the `NameColumn` component.
 * @returns Parsed {@link NameColumnConfig} object.
 */
export const parseProps = (element: ReactElement): NameColumnConfig => {
  const props = element.props || {};

  return {
    columnTitle: props.columnTitle,
    width: props.width,
    sortable: props.sortable,
    render: props.render,
    showDescription: props.showDescription,
    showTags: props.showTags,
    showStarred: props.showStarred,
  };
};

/**
 * Build the Name column with smart defaults.
 *
 * Tags and starred visibility defaults are based on the provider's supports config:
 * - `showTags` defaults to `true` only if `supports.tags` is `true`.
 * - `showStarred` defaults to `true` only if `supports.starred` is `true`.
 *
 * Users can still explicitly set these to `true`/`false` to override the defaults.
 */
export const buildColumn: ColumnBuilder<SupportedColumnsConfig['name']> = (
  config,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | null => {
  // If explicitly set to false, don't render.
  if (config === false) {
    return null;
  }

  const customConfig = (typeof config === 'object' ? config : {}) as NameColumnConfig;

  const showDescription = customConfig.showDescription ?? true;

  // Show tags by default only if tags feature is supported (enabled on provider).
  // Can be explicitly set to true/false to override.
  const showTags = customConfig.showTags ?? context.supports?.tags ?? false;

  // Show starred by default only if starred feature is supported (enabled on provider).
  // Can be explicitly set to true/false to override.
  const showStarred = customConfig.showStarred ?? context.supports?.starred ?? false;

  // Determine sortability:
  // 1. If explicitly set via `sortable` prop, use that.
  // 2. Otherwise, check if 'title' is in `sortableFields`.
  // 3. Fall back to true if no sortableFields config (backwards compatibility).
  const sortable = customConfig.sortable ?? context.sortableFields?.includes('title') ?? true;

  return {
    field: 'title',
    name: customConfig.columnTitle ?? 'Name',
    sortable,
    ...(customConfig.width && { width: customConfig.width }),
    'data-test-subj': 'content-list-table-column-name',
    render: (title: string, item: ContentListItem) => {
      // Use custom render if provided.
      if (customConfig.render) {
        return customConfig.render(item);
      }

      // Default: render rich name cell.
      return (
        <NameCell
          item={item}
          showDescription={showDescription}
          showTags={showTags}
          showStarred={showStarred}
        />
      );
    },
  };
};
