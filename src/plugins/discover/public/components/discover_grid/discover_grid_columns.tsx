/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGridColumn,
  EuiIconTip,
  EuiListGroupItemProps,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridSettings } from './types';
import { ElasticSearchHit, HitsFlattened } from '../../types';
import { buildCellActions } from './discover_grid_cell_actions';
import { getSchemaByKbnType } from './discover_grid_schema';
import { SelectButton } from './discover_grid_document_selection';
import { defaultTimeColumnWidth } from './constants';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './copy_column_button';
import { DiscoverServices } from '../../build_services';

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

export function buildEuiGridColumn({
  columnName,
  columnWidth = 0,
  indexPattern,
  defaultColumns,
  isSortEnabled,
  rows,
  rowsFlattened,
  services,
}: {
  columnName: string;
  columnWidth: number | undefined;
  indexPattern: DataView;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  rows: ElasticSearchHit[];
  rowsFlattened: HitsFlattened;
  services: DiscoverServices;
}) {
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
      additional: [
        buildCopyColumnNameButton(columnName, services),
        buildCopyColumnValuesButton(columnName, rows, rowsFlattened, indexPattern, services),
      ].filter((item) => !!item) as EuiListGroupItemProps[],
    },
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  if (column.id === indexPattern.timeFieldName) {
    const primaryTimeAriaLabel = i18n.translate(
      'discover.docTable.tableHeader.timeFieldIconTooltipAriaLabel',
      { defaultMessage: 'Primary time field.' }
    );
    const primaryTimeTooltip = i18n.translate(
      'discover.docTable.tableHeader.timeFieldIconTooltip',
      {
        defaultMessage: 'This field represents the time that events occurred.',
      }
    );

    column.display = (
      <Fragment>
        {indexPatternField?.customLabel ?? indexPattern.timeFieldName}{' '}
        <EuiIconTip
          iconProps={{ tabIndex: -1 }}
          type="clock"
          aria-label={primaryTimeAriaLabel}
          content={primaryTimeTooltip}
        />
      </Fragment>
    );
    column.initialWidth = defaultTimeColumnWidth;
  }
  if (columnWidth > 0) {
    column.initialWidth = Number(columnWidth);
  }
  return column;
}

export function getEuiGridColumns({
  columns,
  rows,
  rowsFlattened,
  settings,
  indexPattern,
  showTimeCol,
  defaultColumns,
  isSortEnabled,
  services,
}: {
  columns: string[];
  rows: ElasticSearchHit[];
  rowsFlattened: HitsFlattened;
  settings: DiscoverGridSettings | undefined;
  indexPattern: DataView;
  showTimeCol: boolean;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  services: DiscoverServices;
}) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    const usedColumns = [indexPattern.timeFieldName, ...columns];
    return usedColumns.map((column) =>
      buildEuiGridColumn({
        columnName: column,
        columnWidth: getColWidth(column),
        indexPattern,
        defaultColumns,
        isSortEnabled,
        rows,
        rowsFlattened,
        services,
      })
    );
  }

  return columns.map((column) =>
    buildEuiGridColumn({
      columnName: column,
      columnWidth: getColWidth(column),
      indexPattern,
      defaultColumns,
      isSortEnabled,
      rows,
      rowsFlattened,
      services,
    })
  );
}

export function getVisibleColumns(columns: string[], indexPattern: DataView, showTimeCol: boolean) {
  const timeFieldName = indexPattern.timeFieldName;

  if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
