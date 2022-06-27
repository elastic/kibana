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
  indexPattern,
  defaultColumns,
  isSortEnabled,
  services,
  valueToStringConverter,
  rowsCount,
}: {
  columnName: string;
  columnWidth: number | undefined;
  indexPattern: DataView;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
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
    cellActions: indexPatternField ? buildCellActions(indexPatternField) : [],
  };

  if (column.id === indexPattern.timeFieldName) {
    const timeFieldName = indexPatternField?.customLabel ?? indexPattern.timeFieldName;
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
  indexPattern,
  showTimeCol,
  defaultColumns,
  isSortEnabled,
  services,
  valueToStringConverter,
}: {
  columns: string[];
  rowsCount: number;
  settings: DiscoverGridSettings | undefined;
  indexPattern: DataView;
  showTimeCol: boolean;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
}) {
  const timeFieldName = indexPattern.timeFieldName;
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  let visibleColumns = columns;
  if (showTimeCol && indexPattern.timeFieldName && !columns.find((col) => col === timeFieldName)) {
    visibleColumns = [indexPattern.timeFieldName, ...columns];
  }

  return visibleColumns.map((column) =>
    buildEuiGridColumn({
      columnName: column,
      columnWidth: getColWidth(column),
      indexPattern,
      defaultColumns,
      isSortEnabled,
      services,
      valueToStringConverter,
      rowsCount,
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
