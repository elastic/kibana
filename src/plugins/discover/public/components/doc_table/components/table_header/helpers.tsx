/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView } from 'src/plugins/data_views/public';

export type SortOrder = [string, string];
export interface ColumnProps {
  name: string;
  displayName: string;
  isSortable: boolean;
  isRemoveable: boolean;
  colLeftIdx: number;
  colRightIdx: number;
}

/**
 * Returns properties necessary to display the time column
 * If it's an DataView with timefield, the time column is
 * prepended, not moveable and removeable
 * @param timeFieldName
 */
export function getTimeColumn(timeFieldName: string): ColumnProps {
  return {
    name: timeFieldName,
    displayName: timeFieldName,
    isSortable: true,
    isRemoveable: false,
    colLeftIdx: -1,
    colRightIdx: -1,
  };
}
/**
 * A given array of column names returns an array of properties
 * necessary to display the columns. If the given indexPattern
 * has a timefield, a time column is prepended
 * @param columns
 * @param indexPattern
 * @param hideTimeField
 * @param isShortDots
 */
export function getDisplayedColumns(
  columns: string[],
  indexPattern: DataView,
  hideTimeField: boolean,
  isShortDots: boolean
) {
  if (!Array.isArray(columns) || typeof indexPattern !== 'object' || !indexPattern.getFieldByName) {
    return [];
  }

  const columnProps =
    columns.length === 0
      ? [
          {
            name: '__document__',
            displayName: i18n.translate('discover.docTable.tableHeader.documentHeader', {
              defaultMessage: 'Document',
            }),
            isSortable: false,
            isRemoveable: false,
            colLeftIdx: -1,
            colRightIdx: -1,
          },
        ]
      : columns.map((column, idx) => {
          const field = indexPattern.getFieldByName(column);
          return {
            name: column,
            displayName: field?.displayName ?? column,
            isSortable: !!(field && field.sortable),
            isRemoveable: column !== '_source' || columns.length > 1,
            colLeftIdx: idx - 1 < 0 ? -1 : idx - 1,
            colRightIdx: idx + 1 >= columns.length ? -1 : idx + 1,
          };
        });

  return !hideTimeField && indexPattern.timeFieldName
    ? [getTimeColumn(indexPattern.timeFieldName), ...columnProps]
    : columnProps;
}
