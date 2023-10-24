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
  EuiIcon,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { ExpandButton } from './data_table_expand_button';
import { UnifiedDataTableSettings } from '../types';
import type { ValueToStringConverter, DataTableColumnTypes } from '../types';
import { buildCellActions } from './default_cell_actions';
import { getSchemaByKbnType } from './data_table_schema';
import { SelectButton } from './data_table_document_selection';
import { defaultTimeColumnWidth } from '../constants';
import { buildCopyColumnNameButton, buildCopyColumnValuesButton } from './build_copy_column_button';
import { buildEditFieldButton } from './build_edit_field_button';
import { DataTableColumnHeader } from './data_table_column_header';

const DataTableColumnHeaderMemoized = React.memo(DataTableColumnHeader);

const openDetails = {
  id: 'openDetails',
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
  id: 'select',
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

export function getLeadControlColumns(canSetExpandedDoc: boolean) {
  if (!canSetExpandedDoc) {
    return [select];
  }
  return [openDetails, select];
}

function buildEuiGridColumn({
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
  columnTypes,
  showColumnTokens,
}: {
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
  columnTypes?: DataTableColumnTypes;
  showColumnTokens?: boolean;
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

  const columnType = columnTypes?.[columnName] ?? dataViewField?.type;

  const column: EuiDataGridColumn = {
    id: columnName,
    schema: getSchemaByKbnType(columnType),
    isSortable: isSortEnabled && (isPlainRecord || dataViewField?.sortable === true),
    display: showColumnTokens ? (
      <DataTableColumnHeaderMemoized
        dataView={dataView}
        columnName={columnName}
        columnDisplayName={columnDisplayName}
        columnTypes={columnTypes}
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
    const timeFieldName = dataViewField?.customLabel ?? dataView.timeFieldName;
    const primaryTimeAriaLabel = i18n.translate(
      'unifiedDataTable.tableHeader.timeFieldIconTooltipAriaLabel',
      {
        defaultMessage: '{timeFieldName} - this field represents the time that events occurred.',
        values: { timeFieldName },
      }
    );
    const primaryTimeTooltip = i18n.translate('unifiedDataTable.tableHeader.timeFieldIconTooltip', {
      defaultMessage: 'This field represents the time that events occurred.',
    });

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
  columnTypes,
  showColumnTokens,
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
  columnTypes?: DataTableColumnTypes;
  showColumnTokens?: boolean;
}) {
  const getColWidth = (column: string) => settings?.columns?.[column]?.width ?? 0;

  return columns.map((column, columnIndex) =>
    buildEuiGridColumn({
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
      columnTypes,
      showColumnTokens,
    })
  );
}

export function getVisibleColumns(columns: string[], dataView: DataView, showTimeCol: boolean) {
  const timeFieldName = dataView.timeFieldName;

  if (showTimeCol && timeFieldName && !columns.find((col) => col === timeFieldName)) {
    return [timeFieldName, ...columns];
  }

  return columns;
}
