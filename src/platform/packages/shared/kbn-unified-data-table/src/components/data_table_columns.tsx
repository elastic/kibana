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
import {
  type EuiDataGridColumn,
  type EuiDataGridColumnCellAction,
  EuiScreenReaderOnly,
  EuiListGroupItemProps,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExpandButton } from './data_table_expand_button';
import { CustomGridColumnsConfiguration, UnifiedDataTableSettings } from '../types';
import type { ValueToStringConverter, DataTableColumnsMeta } from '../types';
import { buildCellActions } from './default_cell_actions';
import { getSchemaByKbnType } from './data_table_schema';
import { SelectButton, getSelectAllButton } from './data_table_document_selection';
import {
  defaultTimeColumnWidth,
  ROWS_HEIGHT_OPTIONS,
  DEFAULT_CONTROL_COLUMN_WIDTH,
} from '../constants';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';
import { buildEditFieldButton } from './build_edit_field_button';
import { DataTableColumnHeader, DataTableTimeColumnHeader } from './data_table_column_header';
import { UnifiedDataTableProps } from './data_table';

export const getColumnDisplayName = (
  columnName: string,
  dataViewFieldDisplayName: string | undefined,
  columnDisplay: string | undefined
) => {
  if (columnDisplay) {
    return columnDisplay;
  }

  if (columnName === '_source') {
    return i18n.translate('unifiedDataTable.grid.documentHeader', {
      defaultMessage: 'Summary',
    });
  }

  return dataViewFieldDisplayName || columnName;
};

const DataTableColumnHeaderMemoized = React.memo(DataTableColumnHeader);
const DataTableTimeColumnHeaderMemoized = React.memo(DataTableTimeColumnHeader);

export const OPEN_DETAILS = 'openDetails';
export const SELECT_ROW = 'select';

const openDetails = {
  id: OPEN_DETAILS,
  width: DEFAULT_CONTROL_COLUMN_WIDTH,
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

const getSelect = (rows: DataTableRecord[]) => ({
  id: SELECT_ROW,
  width: DEFAULT_CONTROL_COLUMN_WIDTH,
  rowCellRender: SelectButton,
  headerCellRender: getSelectAllButton(rows),
});

export function getLeadControlColumns({
  rows,
  canSetExpandedDoc,
}: {
  rows: DataTableRecord[];
  canSetExpandedDoc: boolean;
}) {
  if (!canSetExpandedDoc) {
    return [getSelect(rows)];
  }
  return [openDetails, getSelect(rows)];
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
  cellActionsHandling,
  visibleCellActions,
  columnsMeta,
  showColumnTokens,
  headerRowHeight,
  customGridColumnsConfiguration,
  columnDisplay,
  onResize,
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
  cellActionsHandling: 'replace' | 'append';
  visibleCellActions?: number;
  columnsMeta?: DataTableColumnsMeta;
  showColumnTokens?: boolean;
  headerRowHeight?: number;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  columnDisplay?: string;
  onResize: UnifiedDataTableProps['onResize'];
}) {
  const dataViewField = getDataViewFieldOrCreateFromColumnMeta({
    dataView,
    fieldName: columnName,
    columnMeta: columnsMeta?.[columnName],
  });
  const editFieldButton =
    editField &&
    dataViewField &&
    buildEditFieldButton({ hasEditDataViewPermission, dataView, field: dataViewField, editField });
  const resetWidthButton: EuiListGroupItemProps | undefined =
    onResize && columnWidth > 0
      ? {
          // @ts-expect-error
          // We need to force a key here because EuiListGroup uses the array index as a key by default,
          // which causes re-render issues with conditional items like this one, and can result in
          // incorrect attributes (e.g. title) on the HTML element as well as test failures
          key: 'reset-width',
          label: i18n.translate('unifiedDataTable.grid.resetColumnWidthButton', {
            defaultMessage: 'Reset width',
          }),
          iconType: 'refresh',
          size: 'xs',
          iconProps: { size: 'm' },
          onClick: () => {
            onResize({ columnId: columnName, width: undefined });
          },
          'data-test-subj': 'unifiedDataTableResetColumnWidth',
        }
      : undefined;

  const columnDisplayName = getColumnDisplayName(
    columnName,
    dataViewField?.displayName,
    columnDisplay
  );

  let cellActions: EuiDataGridColumnCellAction[];

  if (columnCellActions?.length && cellActionsHandling === 'replace') {
    cellActions = columnCellActions;
  } else {
    cellActions = dataViewField
      ? buildCellActions(
          dataViewField,
          isPlainRecord,
          toastNotifications,
          valueToStringConverter,
          onFilter
        )
      : [];

    if (columnCellActions?.length && cellActionsHandling === 'append') {
      cellActions.push(...columnCellActions);
    }
  }

  const columnType = dataViewField?.type;

  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(columnType),
    isSortable:
      isSortEnabled &&
      // TODO: would be great to have something like `sortable` flag for text based columns too
      ((isPlainRecord && columnName !== '_source') || dataViewField?.sortable === true),
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
        ...(resetWidthButton ? [resetWidthButton] : []),
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
    displayHeaderCellProps: { className: 'unifiedDataTable__headerCell' },
  };

  if (column.id === dataView.timeFieldName) {
    column.display = (
      <DataTableTimeColumnHeaderMemoized
        dataView={dataView}
        dataViewField={dataViewField}
        headerRowHeight={headerRowHeight}
        columnLabel={columnDisplay}
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
  }

  return headerRowHeightLines;
};

export function getEuiGridColumns({
  columns,
  columnsCellActions,
  cellActionsHandling,
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
  onResize,
}: {
  columns: string[];
  columnsCellActions?: EuiDataGridColumnCellAction[][];
  cellActionsHandling: 'replace' | 'append';
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
  onFilter?: DocViewFilterFn;
  editField?: (fieldName: string) => void;
  visibleCellActions?: number;
  columnsMeta?: DataTableColumnsMeta;
  showColumnTokens?: boolean;
  headerRowHeightLines: number;
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  onResize: UnifiedDataTableProps['onResize'];
}) {
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;
  const headerRowHeight = deserializeHeaderRowHeight(headerRowHeightLines);
  const numberOfColumns = columns.length;

  return columns.map((column, columnIndex) =>
    buildEuiGridColumn({
      numberOfColumns,
      columnName: column,
      columnCellActions: columnsCellActions?.[columnIndex],
      cellActionsHandling,
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
      columnDisplay: settings?.columns?.[column]?.display,
      onResize,
    })
  );
}
