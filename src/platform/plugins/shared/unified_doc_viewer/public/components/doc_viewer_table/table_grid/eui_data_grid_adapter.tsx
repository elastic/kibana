/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridCellPopoverElementProps,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridStyle,
  IconType,
  UseEuiTheme,
} from '@elastic/eui';
import { EuiDataGrid, EuiIconTip, EuiSpacer, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  TableGridCellActionIcon,
  TableGridCellActionDefinition,
  TableGridCellAddress,
  TableGridCellContext,
  TableGridModel,
} from './model';

const actionIcons: Record<TableGridCellActionIcon, IconType> = {
  add: 'plusCircle',
  copy: 'copy',
  filter: 'filter',
  remove: 'cross',
  subtract: 'minusCircle',
};

const getCellContext = <TRow,>(
  model: TableGridModel<TRow>,
  rowIndex: number,
  columnId: string
): TableGridCellContext<TRow> | undefined => {
  const row = model.rows[rowIndex];
  if (!row) {
    return undefined;
  }

  return { row, rowId: model.getRowId(row), columnId };
};

const getGridStyle = <TRow,>(model: TableGridModel<TRow>): EuiDataGridStyle => ({
  ...model.appearance,
});

type EuiCellActions = NonNullable<EuiDataGridProps['columns'][number]['cellActions']>;

export const getEuiCellActions = <TRow,>({
  definitions,
  rows,
  getRowId,
  columnId,
}: {
  definitions: readonly TableGridCellActionDefinition<TRow>[] | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  columnId: string;
}): EuiCellActions | undefined =>
  definitions?.map((definition) => {
    const CellAction: EuiCellActions[number] = ({ Component, rowIndex }) => {
      const row = rows[rowIndex];
      const action = row ? definition.resolve({ row, rowId: getRowId(row), columnId }) : undefined;
      if (!action) {
        return null;
      }

      return (
        <Component
          data-test-subj={action.dataTestSubj}
          iconType={actionIcons[action.icon]}
          title={action.label}
          flush="left"
          onClick={action.onExecute}
        >
          {action.label}
        </Component>
      );
    };
    return CellAction;
  });

export interface EuiDataGridAdapterProps<TRow> {
  model: TableGridModel<TRow>;
}

interface PendingFocus {
  address: TableGridCellAddress;
  fallbackRowIndex: number;
}

export function EuiDataGridAdapter<TRow>({ model }: EuiDataGridAdapterProps<TRow>) {
  const styles = useMemoCss(componentStyles);
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const modelRef = useRef(model);
  const pendingFocusRef = useRef<PendingFocus | null>(null);
  const { columns, getRowId, leadingControlColumns: modelLeadingControlColumns, rows } = model;
  modelRef.current = model;

  const requestFocus = useCallback((address: TableGridCellAddress) => {
    const { getRowId: getCurrentRowId, rows: currentRows } = modelRef.current;
    pendingFocusRef.current = {
      address,
      fallbackRowIndex: currentRows.findIndex((row) => getCurrentRowId(row) === address.rowId),
    };
  }, []);

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    const { address, fallbackRowIndex } = pendingFocus;
    const requestedRowIndex = rows.findIndex((row) => getRowId(row) === address.rowId);
    const rowIndex =
      requestedRowIndex >= 0 ? requestedRowIndex : Math.min(fallbackRowIndex, rows.length - 1);
    const columnIds = [
      ...modelLeadingControlColumns.map(({ id }) => id),
      ...columns.map(({ id }) => id),
    ];
    const colIndex = columnIds.indexOf(address.columnId);

    if (rowIndex >= 0 && colIndex >= 0) {
      dataGridRef.current?.setFocusedCell({ rowIndex, colIndex });
    }
    pendingFocusRef.current = null;
  }, [columns, getRowId, modelLeadingControlColumns, rows]);

  const gridColumns = useMemo<EuiDataGridProps['columns']>(
    () =>
      model.columns.map((column) => ({
        id: column.id,
        displayAsText: column.label,
        initialWidth: column.initialWidth,
        actions: false,
        visibleCellActions: column.visibleCellActions,
        cellActions: getEuiCellActions({
          definitions: column.actions,
          rows: model.rows,
          getRowId: model.getRowId,
          columnId: column.id,
        }),
      })),
    [model]
  );

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId }) => {
      const column = model.columns.find(({ id }) => id === columnId);
      const context = getCellContext(model, rowIndex, columnId);
      return column && context ? column.renderCell(context) : null;
    },
    [model]
  );

  const renderCellPopover = useCallback(
    ({ columnId, cellActions, rowIndex }: EuiDataGridCellPopoverElementProps) => {
      const column = model.columns.find(({ id }) => id === columnId);
      const context = getCellContext(model, rowIndex, columnId);
      if (!column || !context) {
        return null;
      }

      const warningMessage = column.getDetailsWarning?.(context);
      return (
        <>
          <div className="kbnDocViewer__fieldsGridDetails">{column.renderDetails(context)}</div>
          {cellActions}
          {warningMessage && (
            <div>
              <EuiSpacer size="xs" />
              <KbnWarningCallout announceOnMount={false} title={warningMessage} size="s" />
            </div>
          )}
        </>
      );
    },
    [model]
  );

  const leadingControlColumns = useMemo<EuiDataGridProps['leadingControlColumns']>(
    () =>
      modelLeadingControlColumns.map((column) => ({
        id: column.id,
        width: column.width,
        headerCellRender: () => (
          <EuiIconTip aria-label={column.label} type="info" content={column.label} />
        ),
        rowCellRender: ({ rowIndex }) => {
          const context = getCellContext(modelRef.current, rowIndex, column.id);
          return context ? column.renderCell({ ...context, requestFocus }) : null;
        },
      })),
    [modelLeadingControlColumns, requestFocus]
  );

  const isScrollRestored = useRef(false);
  const virtualizationOptions = useMemo<EuiDataGridProps['virtualizationOptions']>(
    () => ({
      onScroll: ({ scrollTop }) => {
        if (isScrollRestored.current) {
          model.scroll.onChange(scrollTop);
        } else {
          requestAnimationFrame(() => {
            dataGridRef.current?.scrollTo?.({ scrollTop: model.scroll.initialTop });
            isScrollRestored.current = true;
          });
        }
      },
    }),
    [model.scroll]
  );

  return (
    <EuiDataGrid
      key={`fields-table-${model.id}`}
      ref={dataGridRef}
      data-test-subj="UnifiedDocViewerTableGrid"
      aria-label={model.ariaLabel}
      className="kbnDocViewer__fieldsGrid"
      css={styles.fieldsGrid}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns: model.columns.map(({ id }) => id),
        setVisibleColumns: () => undefined,
      }}
      gridStyle={getGridStyle(model)}
      headerVisibility={model.headerVisibility}
      toolbarVisibility={false}
      rowCount={model.rows.length}
      rowHeightsOptions={{ defaultHeight: model.rowHeight }}
      renderCellValue={renderCellValue}
      renderCellPopover={renderCellPopover}
      leadingControlColumns={leadingControlColumns}
      virtualizationOptions={virtualizationOptions}
    />
  );
}

const componentStyles = {
  fieldsGrid: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');
    const fieldNameTopPadding = `calc(${euiTheme.size.xs} * 1.5)`;

    return css({
      '&.euiDataGrid--noControls.euiDataGrid--bordersHorizontal .euiDataGridHeader': {
        borderTop: 'none',
      },

      '&.euiDataGrid--noHeader': {
        overflow: 'visible',
      },

      '&.euiDataGrid--noHeader .euiDataGrid__content': {
        overflow: 'visible',
      },

      '&.euiDataGrid--noHeader .euiDataGrid__virtualized': {
        overflow: 'visible !important',
      },

      '&.euiDataGrid--noHeader .euiDataGridRow:first-of-type .euiDataGridRowCell': {
        borderBlockStart: 'none',
      },

      '&.euiDataGrid--headerUnderline .euiDataGridHeader': {
        borderBottom: euiTheme.border.thin,
      },

      '& [data-gridcell-column-id="name"] .euiDataGridRowCell__content': {
        paddingTop: 0,
        paddingBottom: 0,
      },

      '& [data-gridcell-column-id="pin_field"] .euiDataGridRowCell__content': {
        padding: `calc(${euiTheme.size.xs} / 2) 0 0 ${euiTheme.size.xs}`,
      },

      '.kbnDocViewer__fieldName': {
        paddingTop: fieldNameTopPadding,
        paddingLeft: 0,
        lineHeight: euiTheme.font.lineHeightMultiplier,

        '.kbnDocViewer__fieldsGridDetails &': {
          fontSize,
        },
      },

      '.kbnDocViewer__fieldName_icon': {
        paddingTop: fieldNameTopPadding,
        lineHeight: euiTheme.font.lineHeightMultiplier,
      },

      '.kbnDocViewer__fieldName_multiFieldBadge': {
        margin: `${euiTheme.size.xs} 0`,
        fontWeight: euiTheme.font.weight.regular,
        fontFamily: euiTheme.font.family,
      },

      '.kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 0,
      },

      '& [data-gridcell-column-id="pin_field"]:focus-within': {
        '.kbnDocViewer__fieldsGrid__pinAction': {
          opacity: 1,
        },
      },

      '.euiDataGridRow:hover .kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 1,
      },
    });
  },
};
