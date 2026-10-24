/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { EuiDataGridColumnCellAction, UseEuiTheme } from '@elastic/eui';
import { EuiIconTip, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IToasts } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type {
  DataGridCellRenderProps,
  DataGridColumn,
  DataGridControlColumn,
  DataGridRef,
} from '@kbn/data-grid';
import { DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS, DataGrid } from '@kbn/data-grid';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { FieldRow } from './field_row';
import { PinControlCell } from './get_pin_control';
import { useRestorableRef } from './restorable_state';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from './table_cell_actions';
import { TableCell } from './table_cell';
import type { UseTableFiltersCallbacksReturn } from './table_filters';
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid_constants';

const PIN_COLUMN_ID = 'pin_field';
const PIN_COLUMN_WIDTH = 32;
const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;
const PIN_BUTTON_FOCUS_ATTEMPTS = 10;

export interface FieldsDataGridProps {
  rows: FieldRow[];
  isEsqlMode: boolean;
  toasts: IToasts;
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
  columns?: string[];
  onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
  searchTerm?: string;
  onTogglePinned?: (field: string) => void;
  hidePinColumn?: boolean;
  headerVisibility?: boolean;
  hideFilteringOnComputedColumns?: boolean;
}

const ExpansionWarning = ({ title }: { title?: string }) =>
  title ? (
    <div>
      <EuiSpacer size="xs" />
      <KbnWarningCallout announceOnMount={false} title={title} size="s" />
    </div>
  ) : null;

const getRowId = (row: FieldRow) => row.name;

const getInitialNameColumnWidth = (gridWidth: number) =>
  Math.min(Math.max(Math.round(gridWidth * 0.3), MIN_NAME_COLUMN_WIDTH), MAX_NAME_COLUMN_WIDTH);

const componentStyles = {
  fieldsGrid: ({ euiTheme }: UseEuiTheme) => {
    const fieldNameTopPadding = `calc(${euiTheme.size.xs} * 1.5)`;

    return css({
      height: '100%',

      '.kbnDocViewer__fieldName': {
        paddingTop: fieldNameTopPadding,
        paddingLeft: 0,
        lineHeight: euiTheme.font.lineHeightMultiplier,
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
    });
  },
  nameCell: css({ paddingBlock: 0 }),
  pinCell: ({ euiTheme }: UseEuiTheme) =>
    css({ padding: `calc(${euiTheme.size.xs} / 2) 0 0 ${euiTheme.size.xs}` }),
};

/**
 * The Doc Viewer fields table: one row per document field, rendered with the generic `DataGrid`.
 */
export const FieldsDataGrid = ({
  rows,
  isEsqlMode,
  toasts,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  onFindSearchTermMatch,
  searchTerm = '',
  onTogglePinned,
  hidePinColumn = false,
  headerVisibility = true,
  hideFilteringOnComputedColumns,
}: FieldsDataGridProps) => {
  const styles = useMemoCss(componentStyles);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DataGridRef>(null);
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
  }, [onRemoveColumn, onAddColumn, columns]);

  const fieldCellActions = useMemo<EuiDataGridColumnCellAction[]>(
    () =>
      getFieldCellActions({
        rows,
        isEsqlMode,
        onFilter: filter,
        onToggleColumn,
        columns,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, filter, onToggleColumn, columns, hideFilteringOnComputedColumns]
  );
  const fieldValueCellActions = useMemo<EuiDataGridColumnCellAction[]>(
    () =>
      getFieldValueCellActions({
        rows,
        isEsqlMode,
        toasts,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, toasts, filter, hideFilteringOnComputedColumns]
  );

  const showPinColumn = Boolean(onTogglePinned) && !hidePinColumn;

  // Pinned fields are owned by the parent (restorable + local storage), the grid mirrors them.
  const pinnedRowIds = useMemo(
    () => rows.filter((row) => row.isPinned).map(({ name }) => name),
    [rows]
  );

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const handleTogglePinned = useCallback(
    (field: string, { isKeyboardEvent }: { isKeyboardEvent: boolean }) => {
      const isUnpinning = rowsRef.current.some((row) => row.name === field && row.isPinned);
      onTogglePinned?.(field);
      if (!isKeyboardEvent) {
        return;
      }

      // Keep keyboard focus on the toggled field. Pinned rows are always visible in the sticky
      // section, an unpinned row moves back into the virtualized rows and may need scrolling to.
      let attempts = PIN_BUTTON_FOCUS_ATTEMPTS;
      const focusPinButton = () => {
        const button = containerRef.current?.querySelector<HTMLElement>(
          `[data-test-subj="unifiedDocViewer_pinControlButton_${CSS.escape(field)}"]`
        );
        if (button) {
          button.focus();
        } else if (--attempts > 0) {
          requestAnimationFrame(focusPinButton);
        }
      };
      requestAnimationFrame(() => {
        if (isUnpinning) {
          gridRef.current?.scrollToRow(field);
        }
        focusPinButton();
      });
    },
    [onTogglePinned]
  );

  const leadingControlColumns = useMemo<Array<DataGridControlColumn<FieldRow>>>(() => {
    if (!showPinColumn) {
      return [];
    }
    const pinColumnHeader = i18n.translate('unifiedDocViewer.fieldsTable.pinControlColumnHeader', {
      defaultMessage: 'Pin field column',
    });

    return [
      {
        id: PIN_COLUMN_ID,
        width: PIN_COLUMN_WIDTH,
        cellCss: styles.pinCell,
        header: (
          <EuiIconTip
            aria-label={pinColumnHeader}
            type="info"
            content={pinColumnHeader}
            // Like EuiDataGrid, header content is not a separate tab stop.
            iconProps={{ tabIndex: -1 }}
          />
        ),
        renderCell: ({ row }) => (
          <div className={row.isPinned ? undefined : DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS}>
            <PinControlCell row={row} onTogglePinned={handleTogglePinned} />
          </div>
        ),
      },
    ];
  }, [showPinColumn, styles, handleTogglePinned]);

  const gridColumns = useMemo<Array<DataGridColumn<FieldRow>>>(() => {
    const renderFieldCell = ({
      rowIndex,
      columnId,
      isDetails,
    }: DataGridCellRenderProps<FieldRow>) => (
      <TableCell
        searchTerm={searchTerm}
        rows={rows}
        rowIndex={rowIndex}
        columnId={columnId}
        isDetails={isDetails}
        isESQLMode={isEsqlMode}
        onFindSearchTermMatch={onFindSearchTermMatch}
      />
    );

    const renderWarningFooter =
      (
        getWarning: (
          params: Parameters<typeof getFilterExistsDisabledWarning>[0]
        ) => string | undefined
      ) =>
      (row: FieldRow) =>
        (
          <ExpansionWarning
            title={getWarning({ row, onFilter: filter, hideFilteringOnComputedColumns })}
          />
        );

    return [
      {
        id: GRID_COLUMN_FIELD_NAME,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        initialWidth: getInitialNameColumnWidth,
        minWidth: MIN_NAME_COLUMN_WIDTH,
        isResizable: true,
        cellActions: fieldCellActions,
        cellCss: styles.nameCell,
        renderCell: renderFieldCell,
        renderCellExpansionFooter: renderWarningFooter(getFilterExistsDisabledWarning),
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        cellActions: fieldValueCellActions,
        renderCell: renderFieldCell,
        renderCellExpansionFooter: renderWarningFooter(getFilterInOutPairDisabledWarning),
      },
    ];
  }, [
    styles,
    fieldCellActions,
    fieldValueCellActions,
    rows,
    searchTerm,
    isEsqlMode,
    onFindSearchTermMatch,
    filter,
    hideFilteringOnComputedColumns,
  ]);

  const onScrollOffsetChange = useCallback(
    (scrollTop: number) => {
      scrollTopRef.current = scrollTop;
    },
    [scrollTopRef]
  );

  return (
    <div ref={containerRef} css={styles.fieldsGrid}>
      <DataGrid
        gridRef={gridRef}
        data-test-subj="UnifiedDocViewerTableGrid"
        ariaLabel={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
          defaultMessage: 'Field values',
        })}
        rows={rows}
        columns={gridColumns}
        leadingControlColumns={leadingControlColumns}
        getRowId={getRowId}
        pinnedRowIds={pinnedRowIds}
        showHeader={headerVisibility}
        initialScrollOffset={scrollTopRef.current}
        onScrollOffsetChange={onScrollOffsetChange}
      />
    </div>
  );
};
