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
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { StarredCell } from './starred_cell';

const DEFAULT_WIDTH = '40px';

/**
 * Props for the `Column.Starred` preset component.
 */
export interface StarredColumnProps {
  /** Column width (CSS value). Defaults to `'40px'`. */
  width?: string;
}

/**
 * Build an `EuiBasicTableColumn` from `Column.Starred` declarative attributes.
 *
 * Returns `undefined` when `supports.starred` is false so the column is
 * omitted entirely from the table (no empty column or wasted space).
 * Returns a narrow, non-sortable column containing a star icon button otherwise.
 */
export const buildStarredColumn = (
  attributes: StarredColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | undefined => {
  if (!context.supports?.starred) {
    return undefined;
  }

  const { width = DEFAULT_WIDTH } = attributes;

  return {
    field: 'id',
    name: '',
    sortable: false,
    width,
    'data-test-subj': 'content-list-table-column-starred',
    render: (_value: string, item: ContentListItem) => {
      return <StarredCell id={item.id} />;
    },
  };
};

/**
 * Starred column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies a narrow star-icon column.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable title="Dashboards">
 *   <Column.Starred />
 *   <Column.Name />
 *   <Column.UpdatedAt />
 * </ContentListTable>
 * ```
 */
export const StarredColumn = column.createPreset({
  name: 'starred',
  resolve: buildStarredColumn,
});
