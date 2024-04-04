/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  type EuiDataGridColumn,
  type EuiDataGridColumnCellAction,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { ExpandButton } from './data_table_expand_button';
import { ControlColumns, CustomGridColumnsConfiguration, UnifiedDataTableSettings } from '../types';
import type { ValueToStringConverter, DataTableColumnsMeta } from '../types';
import { buildCellActions } from './default_cell_actions';
import { getSchemaByKbnType } from './data_table_schema';
import { SelectButton } from './data_table_document_selection';
import { defaultTimeColumnWidth, ROWS_HEIGHT_OPTIONS } from '../constants';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';
import { buildEditFieldButton } from './build_edit_field_button';
import { DataTableColumnHeader, DataTableTimeColumnHeader } from './data_table_column_header';

const DataTableColumnHeaderMemoized = React.memo(DataTableColumnHeader);
const DataTableTimeColumnHeaderMemoized = React.memo(DataTableTimeColumnHeader);

export const OPEN_DETAILS = 'openDetails';
export const SELECT_ROW = 'select';

const openDetails = {
  id: OPEN_DETAILS,
  width: 26,
  headerCellRender: () => (
    <EuiScreenReaderOnly>
      <span>
        {i18n.translate('unifiedDataTable.controlColumnHeader', {
          defaultMessage: 'Control column',
        })}
      </span>
    </EuiScreenReaderOnly>
  ),
  rowCellRender: ExpandButton,
};

const select = {
  id: SELECT_ROW,
  width: 24,
  rowCellRender: SelectButton,
  headerCellRender: () => (
    <EuiScreenReaderOnly>
      <span>
        {i18n.translate('unifiedDataTable.selectColumnHeader', {
          defaultMessage: 'Select column',
        })}
      </span>
    </EuiScreenReaderOnly>
  ),
};

export function getAllControlColumns(): ControlColumns {
  return {
    [SELECT_ROW]: select,
    [OPEN_DETAILS]: openDetails,
  };
}

export function getLeadControlColumns(canSetExpandedDoc: boolean) {
  if (!canSetExpandedDoc) {
    return [select];
  }
  return [openDetails, select];
}

function buildEuiGridColumn({
  numberOfColumns,
  columnName,
  columnWidth = 0,
  dataView,
  defaultColumns,
  isSortEnabled,
  isPlainRecord,
  toastNotifications,
  hasEditDataViewPermission,
  valueToStringConverter,
  rowsCount,
  onFilter,
  editField,
  columnCellActions,
  visibleCellActions,
  columnsMeta,
  showColumnTokens,
  headerRowHeight,
  customGridColumnsConfiguration,
}: {
  numberOfColumns: number;
  columnName: string;
  columnWidth: number | undefined;
  dataView: DataView;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  isPlainRecord?: boolean;
  toastNotifications: ToastsStart;
  hasEditDataViewPermission: () => boolean;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
  onFilter?: DocViewFilterFn;
  editField?: (fieldName: string) => void;
  columnCellActions?: EuiDataGridColumnCellAction[];
  visibleCellActions?: number;
  columnsMeta?: DataTableColumnsMeta;
  showColumnTokens?: boolean;
  headerRowHeight?: number;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
}) {
  const dataViewField = dataView.getFieldByName(columnName);
  const editFieldButton =
    editField &&
    dataViewField &&
    buildEditFieldButton({ hasEditDataViewPermission, dataView, field: dataViewField, editField });
  const columnDisplayName =
    columnName === '_source'
      ? i18n.translate('unifiedDataTable.grid.documentHeader', {
          defaultMessage: 'Document',
        })
      : dataViewField?.displayName || columnName;

  let cellActions: EuiDataGridColumnCellAction[];

  if (columnCellActions?.length) {
    cellActions = columnCellActions;
  } else {
    cellActions = dataViewField
      ? buildCellActions(dataViewField, toastNotifications, valueToStringConverter, onFilter)
      : [];
  }

  const columnType = columnsMeta?.[columnName]?.type ?? dataViewField?.type;

  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(columnType),
    isSortable: isSortEnabled && (isPlainRecord || dataViewField?.sortable === true),
    display:
      showColumnTokens || headerRowHeight !== 1 ? (
        <DataTableColumnHeaderMemoized
          dataView={dataView}
          columnName={columnName}
          columnDisplayName={columnDisplayName}
          columnsMeta={columnsMeta}
          showColumnTokens={showColumnTokens}
          headerRowHeight={headerRowHeight}
        />
      ) : undefined,
    displayAsText: columnDisplayName,
    actions: {
      showHide:
        defaultColumns || columnName === dataView.timeFieldName
          ? false
          : {
              label: i18n.translate('unifiedDataTable.removeColumnLabel', {
                defaultMessage: 'Remove column',
              }),
              iconType: 'cross',
            },
      showMoveLeft: !defaultColumns,
      showMoveRight: !defaultColumns,
      additional: [
        ...(columnName === '__source'
          ? []
          : [
              buildCopyColumnNameButton({
                columnDisplayName,
                toastNotifications,
              }),
            ]),
        buildCopyColumnValuesButton({
          columnId: columnName,
          columnDisplayName,
          toastNotifications,
          rowsCount,
          valueToStringConverter,
        }),
        ...(editFieldButton ? [editFieldButton] : []),
      ],
    },
    cellActions,
    visibleCellActions,
  };

  if (column.id === dataView.timeFieldName) {
    column.display = (
      <DataTableTimeColumnHeaderMemoized
        dataView={dataView}
        dataViewField={dataViewField}
        headerRowHeight={headerRowHeight}
      />
    );
    if (numberOfColumns > 1) {
      column.initialWidth = defaultTimeColumnWidth;
    }
  }

  if (columnWidth > 0) {
    column.initialWidth = Number(columnWidth);
  }

  if (customGridColumnsConfiguration && customGridColumnsConfiguration[column.id]) {
    return customGridColumnsConfiguration[column.id]({ column, headerRowHeight });
  }
  return column;
}

export const deserializeHeaderRowHeight = (headerRowHeightLines: number) => {
  if (headerRowHeightLines === ROWS_HEIGHT_OPTIONS.auto) {
    return undefined;
  } else if (headerRowHeightLines === ROWS_HEIGHT_OPTIONS.single) {
    return 1;
  }

  return headerRowHeightLines;
};

export function getEuiGridColumns({
  columns,
  columnsCellActions,
  rowsCount,
  settings,
  dataView,
  defaultColumns,
  isSortEnabled,
  isPlainRecord,
  services,
  hasEditDataViewPermission,
  valueToStringConverter,
  onFilter,
  editField,
  visibleCellActions,
  columnsMeta,
  showColumnTokens,
  headerRowHeightLines,
  customGridColumnsConfiguration,
}: {
  columns: string[];
  columnsCellActions?: EuiDataGridColumnCellAction[][];
  rowsCount: number;
  settings: UnifiedDataTableSettings | undefined;
  dataView: DataView;
  defaultColumns: boolean;
  isSortEnabled: boolean;
  isPlainRecord?: boolean;
  services: {
    uiSettings: IUiSettingsClient;
    toastNotifications: ToastsStart;
  };
  hasEditDataViewPermission: () => boolean;
  valueToStringConverter: ValueToStringConverter;
  onFilter: DocViewFilterFn;
  editField?: (fieldName: string) => void;
  visibleCellActions?: number;
  columnsMeta?: DataTableColumnsMeta;
  showColumnTokens?: boolean;
  headerRowHeightLines: number;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
}) {
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;
  const headerRowHeight = deserializeHeaderRowHeight(headerRowHeightLines);
  const numberOfColumns = columns.length;

  return columns.map((column, columnIndex) =>
    buildEuiGridColumn({
      numberOfColumns,
      columnName: column,
      columnCellActions: columnsCellActions?.[columnIndex],
      columnWidth: getColWidth(column),
      dataView,
      defaultColumns,
      isSortEnabled,
      isPlainRecord,
      toastNotifications: services.toastNotifications,
      hasEditDataViewPermission,
      valueToStringConverter,
      rowsCount,
      onFilter,
      editField,
      visibleCellActions,
      columnsMeta,
      showColumnTokens,
      headerRowHeight,
      customGridColumnsConfiguration,
    })
  );
}

export function canPrependTimeFieldColumn(
  columns: string[],
  timeFieldName: string | undefined,
  columnsMeta: DataTableColumnsMeta | undefined,
  showTimeCol: boolean,
  isPlainRecord: boolean
) {
  if (!showTimeCol || !timeFieldName) {
    return false;
  }

  if (isPlainRecord) {
    return !!columnsMeta && timeFieldName in columnsMeta && columns.includes('_source');
  }

  return true;
}

export function getVisibleColumns(
  columns: string[],
  dataView: DataView,
  shouldPrependTimeFieldColumn: boolean
) {
  const timeFieldName = dataView.timeFieldName;

  if (
    shouldPrependTimeFieldColumn &&
    timeFieldName &&
    !columns.find((col) => col === timeFieldName)
  ) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
