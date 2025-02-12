/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import * as i18n from '../translations';

const remove = ({ columns, index }: { columns: EuiDataGridColumn[]; index: number }) => {
  return [...columns.slice(0, index), ...columns.slice(index + 1)];
};

const insert = ({
  column,
  columns,
  defaultColumns,
}: {
  column: EuiDataGridColumn;
  columns: EuiDataGridColumn[];
  defaultColumns: EuiDataGridColumn[];
}) => {
  const defaultIndex = defaultColumns.findIndex(
    (defaultColumn: EuiDataGridColumn) => defaultColumn.id === column.id
  );
  const isInDefaultConfig = defaultIndex >= 0;

  // if the column isn't shown but it's part of the default config
  // insert into the same position as in the default config
  if (isInDefaultConfig) {
    return [...columns.slice(0, defaultIndex), column, ...columns.slice(defaultIndex)];
  }

  if (columns.length === 0) {
    return [column];
  }

  // if the column isn't shown and it's not part of the default config
  // push it into the second position. Behaviour copied by t_grid, security
  // does this to insert right after the timestamp column
  return [columns[0], column, ...columns.slice(1)];
};

const formatSystemColumn = (column: EuiDataGridColumn): EuiDataGridColumn => {
  const newColumn = { ...column };

  if (newColumn.id === ALERT_CASE_IDS) {
    newColumn.isSortable = false;

    /**
     * If a solution wants to default the case column and set their own
     * display text we should not modified it. For that reason,
     * we check if the displayAsText is set.
     */
    if (!newColumn.displayAsText) {
      newColumn.displayAsText = i18n.CASES;
    }
  }

  if (newColumn.id === ALERT_MAINTENANCE_WINDOW_IDS) {
    newColumn.isSortable = false;

    if (!newColumn.displayAsText) {
      newColumn.displayAsText = i18n.MAINTENANCE_WINDOWS;
    }
  }

  return newColumn;
};

/**
 * @param param.column column to be removed/inserted
 * @param param.columns current array of columns in the grid
 * @param param.defaultColumns Initial columns set up in the configuration before being modified by the user
 * @returns the new list of columns
 */
export const toggleColumn = ({
  column,
  columns,
  defaultColumns,
}: {
  column: EuiDataGridColumn;
  columns: EuiDataGridColumn[];
  defaultColumns: EuiDataGridColumn[];
}): EuiDataGridColumn[] => {
  const currentIndex = columns.findIndex(
    (currentColumn: EuiDataGridColumn) => currentColumn.id === column.id
  );
  const isVisible = currentIndex >= 0;

  /**
   * For the Cases column we want to change the
   * label of the column from kibana.alert.case_ids to Cases.
   */
  const formattedColumn = formatSystemColumn(column);

  if (isVisible) {
    return remove({ columns, index: currentIndex });
  }

  return insert({ defaultColumns, column: formattedColumn, columns });
};
