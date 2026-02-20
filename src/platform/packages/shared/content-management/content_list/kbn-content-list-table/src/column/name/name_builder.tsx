/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { NameCell } from './name_cell';

/** Default i18n-translated column title for the name column. */
const DEFAULT_NAME_COLUMN_TITLE = i18n.translate(
  'contentManagement.contentList.table.column.name.title',
  { defaultMessage: 'Name' }
);

/**
 * Props for the `Column.Name` preset component.
 *
 * These are the declarative attributes consumers pass in JSX. The name builder
 * reads them directly from the parsed attributes.
 */
export interface NameColumnProps {
  /** Column width (CSS value like `'200px'` or `'40%'`). */
  width?: string;
  /** Custom column title. Defaults to `'Name'`. */
  columnTitle?: string;
  /**
   * Whether the column is sortable.
   *
   * @default true
   */
  sortable?: boolean;
  /**
   * Whether to show the description.
   *
   * @default true
   */
  showDescription?: boolean;
  /** Custom render function (overrides default rendering). */
  render?: (item: ContentListItem) => ReactNode;
}

/**
 * Build an `EuiBasicTableColumn` from `Column.Name` declarative attributes.
 *
 * @param attributes - The declarative attributes from the parsed `Column.Name` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the name column.
 */
export const buildNameColumn = (
  attributes: NameColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> => {
  const {
    columnTitle,
    width,
    sortable: sortableProp,
    showDescription = true,
    render: customRender,
  } = attributes;

  const supportsSorting = context.supports?.sorting ?? true;

  // Default sortable to `true` for the title field, when sorting is supported.
  const sortable = supportsSorting ? sortableProp ?? true : false;

  return {
    field: 'title',
    name: columnTitle ?? DEFAULT_NAME_COLUMN_TITLE,
    sortable,
    ...(width && { width }),
    'data-test-subj': 'content-list-table-column-name',
    render: (title: string, item: ContentListItem) => {
      if (customRender) {
        return customRender(item);
      }

      return <NameCell item={item} showDescription={showDescription} />;
    },
  };
};

/**
 * Name column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It's used to specify the Name column configuration as React children.
 *
 * @example Basic usage
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 * </ContentListTable>
 * ```
 *
 * @example With custom configuration
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name
 *     showDescription={false}
 *     width="50%"
 *   />
 * </ContentListTable>
 * ```
 */
export const NameColumn = column.createPreset({ name: 'name', resolve: buildNameColumn });
