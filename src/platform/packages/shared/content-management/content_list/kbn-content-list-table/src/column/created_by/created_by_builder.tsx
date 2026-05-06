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
import type { ContentListItem } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { getColumnLayoutProps, type ColumnLayoutProps } from '../layout';
import { CreatedByCell } from './created_by_cell';

const DEFAULT_COLUMN_TITLE = i18n.translate(
  'contentManagement.contentList.table.column.createdBy',
  { defaultMessage: 'Created by' }
);

/**
 * Props for the `Column.CreatedBy` preset component.
 */
export interface CreatedByColumnProps extends ColumnLayoutProps {
  /** Override column header text. Defaults to "Created by". */
  columnTitle?: string;
}

/**
 * Build an `EuiBasicTableColumn` from `Column.CreatedBy` declarative attributes.
 *
 * Returns `undefined` when `supports.userProfiles` is false so the column is
 * omitted entirely from the table (no empty column or wasted space).
 */
export const buildCreatedByColumn = (
  attributes: CreatedByColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | undefined => {
  if (!context.supports?.userProfiles) {
    return undefined;
  }

  const { columnTitle, ...layoutProps } = attributes;

  return {
    ...getColumnLayoutProps(layoutProps),
    field: 'createdBy',
    name: columnTitle ?? DEFAULT_COLUMN_TITLE,
    sortable: false,
    // The cell renders a small fixed-size `EuiAvatar` (or a `—` placeholder),
    // never free-form text — center it horizontally in the column so it
    // doesn't visually float to the left of the header.
    align: 'center',
    'data-test-subj': 'content-list-table-column-createdBy',
    render: (value: string | undefined, record: ContentListItem) => {
      return <CreatedByCell createdBy={value} managed={!!record.managed} />;
    },
  };
};

/**
 * Created By column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies a column showing the item's creator as a clickable avatar.
 *
 * Clicking the avatar toggles an include filter for that user. Hold
 * Cmd (Mac) or Ctrl (Windows/Linux) while clicking to exclude instead.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable title="Dashboards">
 *   <Column.Name />
 *   <Column.CreatedBy />
 *   <Column.UpdatedAt />
 * </ContentListTable>
 * ```
 */
/** EUI user-profile avatar default diameter. */
const CREATED_BY_AVATAR_SIZE = 24;

export const CreatedByColumn = column.createPreset({
  name: 'createdBy',
  resolve: buildCreatedByColumn,
  skeleton: () => ({
    shape: 'circle',
    size: CREATED_BY_AVATAR_SIZE,
  }),
});
