/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { CreatedByCell } from './created_by_cell';

/** Default i18n-translated column title for the created by column. */
const DEFAULT_CREATED_BY_COLUMN_TITLE = i18n.translate(
  'contentManagement.contentList.table.column.createdBy.title',
  { defaultMessage: 'Created by' }
);

/**
 * Props for the `Column.CreatedBy` preset component.
 */
export interface CreatedByColumnProps {
  /** Column width (CSS value like `'200px'` or `'40%'`). */
  width?: string;
  /** Custom column title. Defaults to `'Created by'`. */
  columnTitle?: string;
  /** Whether the column is sortable. @default false */
  sortable?: boolean;
}

/**
 * Build an `EuiBasicTableColumn` from `Column.CreatedBy` declarative attributes.
 *
 * @param attributes - The declarative attributes from the parsed `Column.CreatedBy` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the created-by column.
 */
export const buildCreatedByColumn = (
  attributes: CreatedByColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> => {
  const { columnTitle, width, sortable: sortableProp } = attributes;

  const supportsSorting = context.supports?.sorting ?? true;
  const sortable = supportsSorting ? sortableProp ?? false : false;

  return {
    field: 'createdBy',
    name: columnTitle ?? DEFAULT_CREATED_BY_COLUMN_TITLE,
    sortable,
    ...(width && { width }),
    'data-test-subj': 'content-list-table-column-createdBy',
    render: (_value: unknown, item: ContentListItem) => (
      <CreatedByCell
        item={item}
        entityName={context.entityName}
        entityNamePlural={context.entityNamePlural}
      />
    ),
  };
};

/**
 * Created by column specification component for `ContentListTable`.
 *
 * This is a declarative component that renders nothing — it tells the
 * `ContentListTable` to include a "Created by" column displaying user avatars,
 * the Elastic managed icon, or a "no creator" tip.
 *
 * Requires `services.userProfile` on the `ContentListProvider` for avatar resolution.
 *
 * @example Basic usage
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable title="Dashboards">
 *   <Column.Name />
 *   <Column.CreatedBy />
 * </ContentListTable>
 * ```
 *
 * @example With custom width
 * ```tsx
 * <Column.CreatedBy width="150px" />
 * ```
 */
export const CreatedByColumn = column.createPreset({
  name: 'createdBy',
  resolve: buildCreatedByColumn,
});
