/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDataGridColumn, EuiScreenReaderOnly } from '@elastic/eui';
import { ViewButton } from './discover_grid_view_button';
import { DiscoverGridSettings } from './types';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';
import { buildCellActions } from './discover_grid_cell_actions';
import { getSchemaByKbnType } from './discover_grid_schema';

export function getLeadControlColumns() {
  return [
    {
      id: 'openDetails',
      width: 31,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.controlColumnHeader', {
              defaultMessage: 'Control column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: ViewButton,
    },
  ];
}

export function buildEuiGridColumn(
  columnName: string,
  columnWidth: number | undefined = 0,
  indexPattern: IndexPattern,
  defaultColumns: boolean
) {
  const timeString = i18n.translate('discover.timeLabel', {
    defaultMessage: 'Time',
  });
  const indexPatternField = indexPattern.getFieldByName(columnName);
  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(indexPatternField?.type),
    isSortable: indexPatternField?.sortable,
    display: indexPatternField?.displayName,
    actions: {
      showHide: defaultColumns
        ? false
        : {
            label: i18n.translate('discover.removeColumnLabel', {
              defaultMessage: 'Remove column',
            }),
          },
      showMoveLeft: !defaultColumns,
      showMoveRight: !defaultColumns,
    },
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  if (column.id === indexPattern.timeFieldName) {
    column.display = `${timeString} (${indexPattern.timeFieldName})`;
    column.initialWidth = 180;
  }
  if (columnWidth > 0) {
    column.initialWidth = Number(columnWidth);
  }
  return column;
}

export function getEuiGridColumns(
  columns: string[],
  settings: DiscoverGridSettings | undefined,
  indexPattern: IndexPattern,
  showTimeCol: boolean,
  defaultColumns: boolean
) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    const usedColumns = [indexPattern.timeFieldName, ...columns];
    return usedColumns.map((column) =>
      buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns)
    );
  }

  return columns.map((column) =>
    buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns)
  );
}

export function getVisibleColumns(
  columns: string[],
  indexPattern: IndexPattern,
  showTimeCol: boolean
) {
  const timeFieldName = indexPattern.timeFieldName;

  if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
