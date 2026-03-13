/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { CreatedByCell } from './created_by_cell';

const DEFAULT_WIDTH = '60px';

const columnName = i18n.translate('contentManagement.contentList.column.createdBy', {
  defaultMessage: 'Creator',
});

/**
 * Props for the `Column.CreatedBy` preset component.
 */
export interface CreatedByColumnProps {
  /** Column width (CSS value). Defaults to `'60px'`. */
  width?: string;
}

/**
 * Build an `EuiBasicTableColumn` from `Column.CreatedBy` declarative attributes.
 *
 * Returns `undefined` when `supports.createdBy` is false so the column is
 * omitted entirely from the table.
 */
export const buildCreatedByColumn = (
  attributes: CreatedByColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | undefined => {
  if (!context.supports?.createdBy) {
    return undefined;
  }

  const { width = DEFAULT_WIDTH } = attributes;

  return {
    field: 'createdBy',
    name: columnName,
    sortable: false,
    width,
    'data-test-subj': 'content-list-table-column-createdBy',
    render: (_value: string | undefined, item: ContentListItem) => {
      return <CreatedByCell {...{ item }} />;
    },
  };
};

/**
 * Created-by column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies a narrow avatar column for the item creator.
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
export const CreatedByColumn = column.createPreset({
  name: 'createdBy',
  resolve: buildCreatedByColumn,
});
