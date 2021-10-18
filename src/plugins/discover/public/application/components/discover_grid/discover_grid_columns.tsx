/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDataGridColumn, EuiIcon, EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridSettings } from './types';
import type { IndexPattern } from '../../../../../data/common';
import { buildCellActions } from './discover_grid_cell_actions';
import { getSchemaByKbnType } from './discover_grid_schema';
import { SelectButton } from './discover_grid_document_selection';
import { defaultTimeColumnWidth } from './constants';

export function getLeadControlColumns() {
  return [
    {
      id: 'openDetails',
      width: 24,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.controlColumnHeader', {
              defaultMessage: 'Control column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: ExpandButton,
    },
    {
      id: 'select',
      width: 24,
      rowCellRender: SelectButton,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.selectColumnHeader', {
              defaultMessage: 'Select column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
    },
  ];
}

export function buildEuiGridColumn(
  columnName: string,
  columnWidth: number | undefined = 0,
  indexPattern: IndexPattern,
  defaultColumns: boolean,
  isSortEnabled: boolean
) {
  const indexPatternField = indexPattern.getFieldByName(columnName);
  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(indexPatternField?.type),
    isSortable: isSortEnabled && indexPatternField?.sortable === true,
    display:
      columnName === '_source'
        ? i18n.translate('discover.grid.documentHeader', {
            defaultMessage: 'Document',
          })
        : indexPatternField?.displayName,
    actions: {
      showHide:
        defaultColumns || columnName === indexPattern.timeFieldName
          ? false
          : {
              label: i18n.translate('discover.removeColumnLabel', {
                defaultMessage: 'Remove column',
              }),
              iconType: 'cross',
            },
      showMoveLeft: !defaultColumns,
      showMoveRight: !defaultColumns,
    },
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  if (column.id === indexPattern.timeFieldName) {
    column.display = (
      <Fragment>
        {indexPatternField?.customLabel ?? indexPattern.timeFieldName}{' '}
        <EuiToolTip
          key="time-column"
          content={i18n.translate('discover.docTable.tableHeader.timeFieldIconTooltip', {
            defaultMessage: 'This column represents primary time field of the data view',
          })}
        >
          <EuiIcon type="clock" color="primary" size="s" />
        </EuiToolTip>
      </Fragment>
    );
    column.initialWidth = defaultTimeColumnWidth;
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
  defaultColumns: boolean,
  isSortEnabled: boolean
) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    const usedColumns = [indexPattern.timeFieldName, ...columns];
    return usedColumns.map((column) =>
      buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns, isSortEnabled)
    );
  }

  return columns.map((column) =>
    buildEuiGridColumn(column, getColWidth(column), indexPattern, defaultColumns, isSortEnabled)
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
