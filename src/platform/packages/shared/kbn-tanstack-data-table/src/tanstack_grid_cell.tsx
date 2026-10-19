/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { flexRender, type Cell } from '@tanstack/react-table';
import { keys, useEuiTheme } from '@elastic/eui';
import {
  HIGHLIGHT_CLASS_NAME as IN_TABLE_SEARCH_HIGHLIGHT_CLASS_NAME,
  InTableSearchHighlightsWrapper,
  getInTableSearchHighlightColors,
} from '@kbn/data-grid-in-table-search';
import type { DataTableRecord } from '@kbn/discover-utils';
import { SOURCE_COLUMN, type UnifiedDataTableProps } from '@kbn/unified-data-table';
import { SELECT_COL_WIDTH, type getTanStackDataGridStyles } from './tanstack_data_grid.styles';
import type { TanStackColumnLayout } from './tanstack_column_layout';
import { CellActions, type CellPopoverState } from './tanstack_grid_cell_actions';
import { formatCellValue, getColumnPinningStyle } from './tanstack_grid_helpers';

const HighlightedText = React.memo(
  ({
    text,
    term,
    isActive,
    styles,
  }: {
    text: string;
    term: string;
    isActive: boolean;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    if (!term) return <>{text}</>;
    const lower = text.toLowerCase();
    const tLower = term.toLowerCase();
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let idx = lower.indexOf(tLower, cursor);

    while (idx !== -1) {
      if (idx > cursor) parts.push(text.slice(cursor, idx));
      parts.push(
        <mark
          key={idx}
          className={IN_TABLE_SEARCH_HIGHLIGHT_CLASS_NAME}
          css={isActive ? styles.searchHighlightActive : styles.searchHighlight}
        >
          {text.slice(idx, idx + term.length)}
        </mark>
      );
      cursor = idx + term.length;
      idx = lower.indexOf(tLower, cursor);
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  }
);

/** Test attributes shared with UnifiedDataTable cells, so test helpers work with both grids. */
export interface GridCellAttributes {
  'data-test-subj': string;
  'data-gridcell-column-id': string;
  'data-gridcell-column-index': number;
  'data-gridcell-row-index': number;
  'data-gridcell-visible-row-index': number;
}

/** Highlights in-table search matches in the rendered summary, like UnifiedDataTable does. */
const SummaryCellHighlights = ({
  findTerm,
  children,
}: {
  findTerm: string;
  children: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const { highlightColor, highlightBackgroundColor } = getInTableSearchHighlightColors(euiTheme);
  return (
    <InTableSearchHighlightsWrapper
      inTableSearchTerm={findTerm}
      highlightColor={highlightColor}
      highlightBackgroundColor={highlightBackgroundColor}
    >
      {children}
    </InTableSearchHighlightsWrapper>
  );
};

const EMBEDDED_CELL_STYLE: React.CSSProperties = { width: '100%', height: '100%' };

// ── Virtual cell with cell actions, popover, and focus support ──
export const VirtualCell = React.memo(
  ({
    cell,
    gridCellAttributes,
    styles,
    isFocused,
    isAutoHeight,
    onFilter,
    setPopoverState,
    findTerm,
    isActiveMatch,
    getColumnStyle,
    embedded = false,
    isRowSelected,
  }: {
    cell: Cell<DataTableRecord, unknown>;
    gridCellAttributes: GridCellAttributes;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    isFocused: boolean;
    isAutoHeight?: boolean;
    onFilter?: UnifiedDataTableProps['onFilter'];
    setPopoverState?: (state: CellPopoverState | null) => void;
    findTerm?: string;
    isActiveMatch: boolean;
    getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    isRowSelected: boolean;
    /** Only used to re-render the control cell, whose content reads the expanded doc from a ref. */
    isRowExpanded: boolean;
    /** Rendered inside a cell of another grid, which owns its width, pinning, role and focus. */
    embedded?: boolean;
  }) => {
    // Visibility follows the pointer (`:hover`). `actionsDismissed` keeps the control hidden
    // after an action until the pointer actually leaves, even if the cell is still hovered.
    const [actionsDismissed, setActionsDismissed] = useState(false);
    const [actionsSession, setActionsSession] = useState(0);
    const dismissActions = useCallback(() => {
      setActionsDismissed(true);
      // Collapse any open bubble so a remount/hover cycle cannot flash action chrome.
      setActionsSession((session) => session + 1);
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest('.tsg-cellActions')) {
        active.blur();
      }
    }, []);
    const resetActions = useCallback(() => {
      setActionsDismissed(false);
      setActionsSession((session) => session + 1);
    }, []);
    const cellRef = useRef<HTMLDivElement>(null);
    const { meta } = cell.column.columnDef;
    const isControl = meta?.isControl;
    const isSelect = meta?.isSelect;
    const isSummary = meta?.isSummary;
    const pinned = cell.column.getIsPinned();
    const isPinned = !embedded && Boolean(pinned);
    const isLastLeftPinned = !embedded && pinned === 'left' && cell.column.getIsLastColumn('left');
    const pinStyle = getColumnPinningStyle(cell.column);
    const cellRole = embedded ? undefined : 'gridcell';
    const cellTabIndex = embedded ? -1 : 0;
    // Same anchor-row class as UnifiedDataTable (surrounding documents view).
    const getCellClassName = (...classNames: Array<string | false>) =>
      [...classNames, cell.row.original.isAnchor && 'unifiedDataTable__cell--highlight']
        .filter(Boolean)
        .join(' ') || undefined;

    if (isControl || isSelect) {
      return (
        <div
          className={getCellClassName(isPinned && 'tsg-pinnedCell')}
          css={[
            isSelect
              ? styles.selectCell
              : meta?.isRowIndicator
              ? styles.rowIndicatorCell
              : styles.controlCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
          style={
            embedded
              ? EMBEDDED_CELL_STYLE
              : {
                  width: isSelect ? SELECT_COL_WIDTH : cell.column.getSize(),
                  flexShrink: 0,
                  ...pinStyle,
                }
          }
          role={cellRole}
          {...gridCellAttributes}
          aria-selected={isSelect && !embedded ? isRowSelected : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    const columnStyle: React.CSSProperties = embedded
      ? EMBEDDED_CELL_STYLE
      : {
          ...getColumnStyle({
            id: cell.column.id,
            isSummary,
            isTimestamp: meta?.isTimestamp,
          }),
          ...pinStyle,
        };

    if (isSummary) {
      const openSummaryPopover = (cellEl: HTMLElement) => {
        if (setPopoverState) {
          const summaryText = Object.entries(cell.row.original.flattened)
            .map(([k, v]) => `${k}: ${formatCellValue(v)}`)
            .join('\n');
          setPopoverState({
            fieldName: SOURCE_COLUMN,
            rowIndex: gridCellAttributes['data-gridcell-row-index'],
            canFilter: false,
            value: summaryText,
            formattedValue: summaryText,
            cellElement: cellEl,
            cellWidth: cellEl.offsetWidth,
          });
        }
      };

      return (
        <div
          className={getCellClassName(isPinned && 'tsg-pinnedCell')}
          css={[
            styles.summaryCell,
            styles.expandableCell,
            isPinned && styles.pinnedCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
          role={cellRole}
          {...gridCellAttributes}
          style={columnStyle}
          tabIndex={cellTabIndex}
          onClick={(e) => openSummaryPopover(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              e.preventDefault();
              openSummaryPopover(e.currentTarget);
            }
          }}
        >
          <div css={isAutoHeight ? styles.summaryCellContentAuto : styles.summaryCellContent}>
            {findTerm ? (
              <SummaryCellHighlights findTerm={findTerm}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </SummaryCellHighlights>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </div>
        </div>
      );
    }

    const fieldName = meta?.fieldName;
    const cellOnFilter = meta?.canFilter === false ? undefined : onFilter;
    const value = cell.getValue();
    const getFormattedValue = () => meta?.formatValue?.(value) ?? formatCellValue(value);
    // Text formatting is only needed for highlighting and actions; skip it for idle cells.
    const formatted = findTerm || fieldName ? getFormattedValue() : undefined;

    const openCellPopover = (cellEl: HTMLElement) => {
      if (fieldName && setPopoverState) {
        setPopoverState({
          fieldName,
          rowIndex: gridCellAttributes['data-gridcell-row-index'],
          value,
          formattedValue: formatted ?? getFormattedValue(),
          canFilter: Boolean(cellOnFilter),
          cellElement: cellEl,
          cellWidth: cellEl.offsetWidth,
        });
      }
    };

    return (
      <div
        ref={cellRef}
        className={getCellClassName(
          isPinned && 'tsg-pinnedCell',
          actionsDismissed && 'tsg-actionsDismissed'
        )}
        css={[
          styles.cell,
          styles.cellWithActions,
          styles.expandableCell,
          isPinned && styles.pinnedCell,
          isLastLeftPinned && styles.pinnedCellShadow,
          isFocused && styles.focusedCell,
        ]}
        style={columnStyle}
        role={cellRole}
        {...gridCellAttributes}
        tabIndex={cellTabIndex}
        onMouseLeave={(event) => {
          const next = event.relatedTarget;
          const leftIntoCell =
            next instanceof Node &&
            (next === event.currentTarget || event.currentTarget.contains(next));
          const rect = event.currentTarget.getBoundingClientRect();
          const pointerStillInside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          // Removing the action button fires a leave while the pointer is still
          // over the cell. Ignore that so the control stays hidden after an action.
          if (leftIntoCell || pointerStillInside) {
            return;
          }
          resetActions();
          const active = document.activeElement;
          if (active instanceof HTMLElement && event.currentTarget.contains(active)) {
            active.blur();
          }
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          if (!event.currentTarget.matches(':hover')) {
            resetActions();
          }
        }}
        onClick={(e) => openCellPopover(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === keys.ENTER || e.key === keys.SPACE) {
            if ((e.target as HTMLElement).closest('.tsg-cellActions')) {
              return;
            }
            e.preventDefault();
            openCellPopover(e.currentTarget);
          }
        }}
      >
        <div
          css={[
            isAutoHeight ? styles.cellContentAuto : styles.cellContent,
            meta?.isTimestamp && styles.timestampCell,
          ]}
        >
          {/* Same value node class as UnifiedDataTable cells. */}
          <span className="unifiedDataTable__cellValue">
            {findTerm && formatted !== undefined ? (
              <HighlightedText
                text={formatted}
                term={findTerm}
                isActive={isActiveMatch}
                styles={styles}
              />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </span>
        </div>
        {fieldName && formatted !== undefined && (
          <CellActions
            key={actionsSession}
            fieldName={fieldName}
            value={value}
            formattedValue={formatted}
            onFilter={cellOnFilter}
            onExpand={openCellPopover}
            onDismiss={dismissActions}
            anchorCellRef={cellRef}
            styles={styles}
          />
        )}
      </div>
    );
  }
);
