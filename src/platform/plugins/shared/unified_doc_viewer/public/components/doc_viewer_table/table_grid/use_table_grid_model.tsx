/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { getUnifiedDocViewerServices } from '../../../plugin';
import type { FieldRow } from '../field_row';
import { getPinColumnControl } from '../get_pin_control';
import { TableCell } from '../table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from '../table_cell_actions';
import type { UseTableFiltersCallbacksReturn } from '../table_filters';
import { useRestorableRef } from '../table';
import type {
  TableGridAppearance,
  TableGridCellContext,
  TableGridColumn,
  TableGridModel,
} from './model';

export const GRID_COLUMN_FIELD_NAME = 'name';
export const GRID_COLUMN_FIELD_VALUE = 'value';

const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;

const defaultAppearance: TableGridAppearance = {
  border: 'horizontal',
  stripes: true,
  rowHover: 'highlight',
  header: 'underline',
};

export interface UseTableGridModelParams {
  id: string;
  containerWidth: number;
  rows: readonly FieldRow[];
  isEsqlMode: boolean;
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
  columns?: string[];
  onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
  searchTerm?: string;
  onTogglePinned?: (field: string) => void;
  hidePinColumn?: boolean;
  renderCell?: (context: TableGridCellContext<FieldRow>) => React.ReactNode;
  renderCellDetails?: (context: TableGridCellContext<FieldRow>) => React.ReactNode;
  appearance?: Partial<TableGridAppearance>;
  headerVisibility?: boolean;
  hideFilteringOnComputedColumns?: boolean;
}

const getRowId = (row: FieldRow) => row.name;

export const useTableGridModel = ({
  id,
  containerWidth,
  rows,
  isEsqlMode,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  onFindSearchTermMatch,
  searchTerm = '',
  onTogglePinned,
  hidePinColumn = false,
  renderCell,
  renderCellDetails,
  appearance,
  headerVisibility,
  hideFilteringOnComputedColumns,
}: UseTableGridModelParams): TableGridModel<FieldRow> => {
  const { toasts } = getUnifiedDocViewerServices();
  const scrollTopRef = useRestorableRef('scrollTop', 0);

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }

    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [columns, onAddColumn, onRemoveColumn]);

  const fieldCellActions = useMemo(
    () =>
      getFieldCellActions({
        columns,
        onFilter: filter,
        onToggleColumn,
        hideFilteringOnComputedColumns,
      }),
    [columns, filter, hideFilteringOnComputedColumns, onToggleColumn]
  );

  const fieldValueCellActions = useMemo(
    () =>
      getFieldValueCellActions({
        toasts,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      }),
    [filter, hideFilteringOnComputedColumns, toasts]
  );

  const gridColumns = useMemo<Array<TableGridColumn<FieldRow>>>(() => {
    const renderDefaultCell = (context: TableGridCellContext<FieldRow>, isDetails: boolean) => (
      <TableCell
        searchTerm={searchTerm}
        row={context.row}
        columnId={context.columnId}
        isDetails={isDetails}
        isESQLMode={isEsqlMode}
        onFindSearchTermMatch={onFindSearchTermMatch}
      />
    );

    const renderDetails = (context: TableGridCellContext<FieldRow>) =>
      renderCellDetails ? (
        renderCellDetails(context)
      ) : (
        <EuiText size="s">{renderDefaultCell(context, true)}</EuiText>
      );

    return [
      {
        id: GRID_COLUMN_FIELD_NAME,
        label: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        initialWidth: Math.min(
          Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
          MAX_NAME_COLUMN_WIDTH
        ),
        visibleCellActions: 3,
        actions: fieldCellActions,
        renderCell: (context) =>
          renderCell ? renderCell(context) : renderDefaultCell(context, false),
        renderDetails,
        getDetailsWarning: ({ row }) =>
          getFilterExistsDisabledWarning({
            row,
            onFilter: filter,
            hideFilteringOnComputedColumns,
          }),
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        label: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        visibleCellActions: 3,
        actions: fieldValueCellActions,
        renderCell: (context) =>
          renderCell ? renderCell(context) : renderDefaultCell(context, false),
        renderDetails,
        getDetailsWarning: ({ row }) =>
          getFilterInOutPairDisabledWarning({
            row,
            onFilter: filter,
            hideFilteringOnComputedColumns,
          }),
      },
    ];
  }, [
    containerWidth,
    fieldCellActions,
    fieldValueCellActions,
    filter,
    hideFilteringOnComputedColumns,
    isEsqlMode,
    onFindSearchTermMatch,
    renderCell,
    renderCellDetails,
    searchTerm,
  ]);

  const leadingControlColumns = useMemo(
    () => (onTogglePinned && !hidePinColumn ? [getPinColumnControl({ onTogglePinned })] : []),
    [hidePinColumn, onTogglePinned]
  );

  return useMemo(
    () => ({
      id,
      ariaLabel: i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
        defaultMessage: 'Field values',
      }),
      rows,
      getRowId,
      columns: gridColumns,
      leadingControlColumns,
      appearance: { ...defaultAppearance, ...appearance },
      headerVisibility,
      rowHeight: 'auto',
      scroll: {
        initialTop: scrollTopRef.current,
        onChange: (scrollTop: number) => {
          scrollTopRef.current = scrollTop;
        },
      },
    }),
    [appearance, gridColumns, headerVisibility, id, leadingControlColumns, rows, scrollTopRef]
  );
};
