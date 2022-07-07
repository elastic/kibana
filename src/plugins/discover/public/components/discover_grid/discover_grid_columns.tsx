/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDataGridColumn, EuiIcon, EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ExpandButton } from './discover_grid_expand_button';
import { DiscoverGridSettings } from './types';
import type { ValueToStringConverter } from '../../types';
import { buildCellActions } from './discover_grid_cell_actions';
import { getSchemaByKbnType } from './discover_grid_schema';
import { SelectButton } from './discover_grid_document_selection';
import { defaultTimeColumnWidth } from './constants';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';
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
  dataView,
  defaultColumns,
  isSortEnabled,
  services,
  valueToStringConverter,
  rowsCount,
}: {
  columnName: string;
  columnWidth: number | undefined;
  dataView: DataView;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
}) {
  const dataViewField = dataView.getFieldByName(columnName);
  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(dataViewField?.type),
    isSortable: isSortEnabled && dataViewField?.sortable === true,
    display:
      columnName === '_source'
        ? i18n.translate('discover.grid.documentHeader', {
            defaultMessage: 'Document',
          })
        : dataViewField?.displayName,
    actions: {
      showHide:
        defaultColumns || columnName === dataView.timeFieldName
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
        ...(columnName === '__source'
          ? []
          : [buildCopyColumnNameButton({ columnId: columnName, services })]),
        buildCopyColumnValuesButton({
          columnId: columnName,
          services,
          rowsCount,
          valueToStringConverter,
        }),
      ],
    },
    cellActions: dataViewField ? buildCellActions(dataViewField) : [],
  };

  if (column.id === dataView.timeFieldName) {
    const timeFieldName = dataViewField?.customLabel ?? dataView.timeFieldName;
    const primaryTimeAriaLabel = i18n.translate(
      'discover.docTable.tableHeader.timeFieldIconTooltipAriaLabel',
      {
        defaultMessage: '{timeFieldName} - this field represents the time that events occurred.',
        values: { timeFieldName },
      }
    );
    const primaryTimeTooltip = i18n.translate(
      'discover.docTable.tableHeader.timeFieldIconTooltip',
      {
        defaultMessage: 'This field represents the time that events occurred.',
      }
    );

    column.display = (
      <div aria-label={primaryTimeAriaLabel}>
        <EuiToolTip content={primaryTimeTooltip}>
          <>
            {timeFieldName} <EuiIcon type="clock" />
          </>
        </EuiToolTip>
      </div>
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
  rowsCount,
  settings,
  dataView,
  showTimeCol,
  defaultColumns,
  isSortEnabled,
  services,
  valueToStringConverter,
}: {
  columns: string[];
  rowsCount: number;
  settings: DiscoverGridSettings | undefined;
  dataView: DataView;
  showTimeCol: boolean;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
}) {
  const timeFieldName = dataView.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  let visibleColumns = columns;
  if (showTimeCol && dataView.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    visibleColumns = [dataView.timeFieldName, ...columns];
  }

  return visibleColumns.map((column) =>
    buildEuiGridColumn({
      columnName: column,
      columnWidth: getColWidth(column),
      dataView,
      defaultColumns,
      isSortEnabled,
      services,
      valueToStringConverter,
      rowsCount,
    })
  );
}

export function getVisibleColumns(columns: string[], dataView: DataView, showTimeCol: boolean) {
  const timeFieldName = dataView.timeFieldName;

  if (showTimeCol && !columns.find((col) => col === timeFieldName)) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
