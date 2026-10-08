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
import { keys } from '@elastic/eui';
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
        <mark key={idx} css={isActive ? styles.searchHighlightActive : styles.searchHighlight}>
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

// ── Virtual cell with cell actions, popover, and focus support ──
export const VirtualCell = React.memo(
  ({
    cell,
    styles,
    isFocused,
    isAutoHeight,
    onFilter,
    setPopoverState,
    findTerm,
    isActiveMatch,
    getColumnStyle,
    isRowSelected,
  }: {
    cell: Cell<DataTableRecord, unknown>;
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
    const isPinned = Boolean(pinned);
    const isLastLeftPinned = pinned === 'left' && cell.column.getIsLastColumn('left');
    const pinStyle = getColumnPinningStyle(cell.column);

    if (isControl || isSelect) {
      return (
        <div
          className={isPinned ? 'tsg-pinnedCell' : undefined}
          css={[
            isSelect ? styles.selectCell : styles.controlCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
          style={{
            width: isSelect ? SELECT_COL_WIDTH : cell.column.getSize(),
            flexShrink: 0,
            ...pinStyle,
          }}
          role="gridcell"
          aria-selected={isSelect ? isRowSelected : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    const columnStyle = {
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
            value: summaryText,
            formattedValue: summaryText,
            cellElement: cellEl,
            cellWidth: cellEl.offsetWidth,
          });
        }
      };

      return (
        <div
          className={isPinned ? 'tsg-pinnedCell' : undefined}
          css={[
            styles.summaryCell,
            styles.expandableCell,
            isPinned && styles.pinnedCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
          role="gridcell"
          style={columnStyle}
          tabIndex={0}
          onClick={(e) => openSummaryPopover(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              e.preventDefault();
              openSummaryPopover(e.currentTarget);
            }
          }}
        >
          <div css={isAutoHeight ? styles.summaryCellContentAuto : styles.summaryCellContent}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </div>
      );
    }

    const fieldName = meta?.fieldName;
    const value = cell.getValue();
    const getFormattedValue = () => meta?.formatValue?.(value) ?? formatCellValue(value);
    // Text formatting is only needed for highlighting and actions; skip it for idle cells.
    const formatted = findTerm || fieldName ? getFormattedValue() : undefined;

    const openCellPopover = (cellEl: HTMLElement) => {
      if (fieldName && setPopoverState) {
        setPopoverState({
          fieldName,
          value,
          formattedValue: formatted ?? getFormattedValue(),
          cellElement: cellEl,
          cellWidth: cellEl.offsetWidth,
        });
      }
    };

    return (
      <div
        ref={cellRef}
        className={
          [
            isPinned ? 'tsg-pinnedCell' : undefined,
            actionsDismissed ? 'tsg-actionsDismissed' : undefined,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        css={[
          styles.cell,
          styles.cellWithActions,
          styles.expandableCell,
          isPinned && styles.pinnedCell,
          isLastLeftPinned && styles.pinnedCellShadow,
          isFocused && styles.focusedCell,
        ]}
        style={columnStyle}
        role="gridcell"
        tabIndex={0}
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
        </div>
        {fieldName && formatted !== undefined && (
          <CellActions
            key={actionsSession}
            fieldName={fieldName}
            value={value}
            formattedValue={formatted}
            onFilter={onFilter}
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
