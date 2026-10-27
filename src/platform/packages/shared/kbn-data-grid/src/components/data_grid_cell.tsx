/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, RefObject } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, keys, tabularCopyMarkers } from '@elastic/eui';
import classNames from 'classnames';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  CELL_ACTIONS_TRIGGER_TEST_SUBJ,
  DATA_GRID_CELL_CONTENT_CLASS,
  CELL_EXPAND_BUTTON_TEST_SUBJ,
} from '../constants';
import type { DataGridStyles } from '../styles';
import type { ColumnLayout } from '../hooks/use_column_virtualization';
import type {
  DataGridCellKey,
  DataGridCellRenderProps,
  DataGridExpandedCell,
  DataGridInternalColumn,
  DataGridProps,
  DataGridSetCellProps,
} from '../types';
import { enterCellContent, exitCellContent } from '../utils/cell_content_focus';
import type { CellActionsBubbleAction } from './cell_actions_bubble/cell_actions_bubble';
import { CellActionsBubble } from './cell_actions_bubble/cell_actions_bubble';
import { CellPopover } from './cell_popover';

interface CellExpansion {
  /** Viewport rect of what opened the expansion popover; undefined while it is closed. */
  anchorRect?: DOMRect;
  open: (anchor?: HTMLElement | null) => void;
  close: () => void;
}

interface UseCellExpansionParams {
  cellRef: RefObject<HTMLDivElement | null>;
  rowId: string;
  columnId: string;
  anchorRect?: DOMRect;
  onOpenExpansion: (cell: DataGridExpandedCell) => void;
  onCloseExpansion: (cell: DataGridCellKey) => void;
}

const useCellExpansion = ({
  cellRef,
  rowId,
  columnId,
  anchorRect,
  onOpenExpansion,
  onCloseExpansion,
}: UseCellExpansionParams): CellExpansion => {
  const isOpen = anchorRect !== undefined;

  const open = useCallback(
    (anchor?: HTMLElement | null) => {
      const cell = cellRef.current;
      // Focus the cell first, so the popover's focus trap returns focus to it when it closes.
      cell?.focus({ preventScroll: true });
      const rect = (anchor ?? cell)?.getBoundingClientRect();
      if (rect) {
        onOpenExpansion({ rowId, columnId, anchorRect: rect });
      }
    },
    [cellRef, rowId, columnId, onOpenExpansion]
  );

  const close = useCallback(
    () => onCloseExpansion({ rowId, columnId }),
    [onCloseExpansion, rowId, columnId]
  );

  // The popover is anchored to a fixed rect, so it would be left behind when the cell scrolls.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(cellRef.current)) {
        close();
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [isOpen, cellRef, close]);

  return useMemo(() => ({ anchorRect, open, close }), [anchorRect, open, close]);
};

const CellActionIconButton: typeof EuiButtonIcon = ({
  children,
  title,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const label = title ?? ariaLabel;
  // An icon-only button without an accessible name is unusable for assistive technology.
  if (!label) {
    return null;
  }
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon {...rest} aria-label={label} size="xs" iconSize="s" color="text" />
    </EuiToolTip>
  );
};

const NO_CELL_ACTIONS: EuiDataGridColumnCellAction[] = [];

type CellValueProps<TRow> = Omit<DataGridCellRenderProps<TRow>, 'isDetails'> & {
  renderCell: DataGridInternalColumn<TRow>['renderCell'];
};

const CellValueComponent = <TRow,>({ renderCell, ...props }: CellValueProps<TRow>) => (
  <>{renderCell({ ...props, isDetails: false })}</>
);

/**
 * The value of a cell. Memoized apart from the hover and focus state of the cell, so revealing the
 * cell actions does not render the value again.
 */
const CellValue = memo(CellValueComponent) as typeof CellValueComponent;

interface CellContentProps<TRow> {
  column: DataGridInternalColumn<TRow>;
  row: TRow;
  rowIndex: number;
  /** Position of the column among all columns, starting at 0. */
  colIndex: number;
  // Whether the cell is hovered or focused, so the comparatively heavy cell actions only mount for it.
  isActive: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
  expansion: CellExpansion;
  setCellProps: (props: DataGridSetCellProps) => void;
  isLastCopyColumn: boolean;
  renderCellPopover?: DataGridProps<TRow>['renderCellPopover'];
  showCellPopoverCloseButton?: boolean;
}

const CellContent = <TRow,>({
  column,
  row,
  rowIndex,
  colIndex,
  isActive,
  anchorRef,
  expansion,
  setCellProps,
  isLastCopyColumn,
  renderCellPopover,
  showCellPopoverCloseButton = true,
}: CellContentProps<TRow>) => {
  const {
    id: columnId,
    cellActions = NO_CELL_ACTIONS,
    visibleCellActions,
    isExpandable = true,
    renderCell,
  } = column;
  const { anchorRect, open: openExpansion, close: closeExpansion } = expansion;
  const isExpanded = anchorRect !== undefined;

  const onExpandClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => openExpansion(event.currentTarget),
    [openExpansion]
  );

  // Direct click on the collapsed bubble trigger expands the cell (hover still reveals quick actions).
  const onActionsTriggerActivate = useCallback(
    (anchor: HTMLElement) => openExpansion(anchor),
    [openExpansion]
  );

  const actions = useMemo<CellActionsBubbleAction[]>(() => {
    const sharedActionProps = {
      rowIndex,
      colIndex,
      columnId,
      isExpanded: false as const,
    };
    const expandLabel = i18n.translate('kbnDataGrid.cell.expandLabel', {
      defaultMessage: 'Expand cell',
    });
    const bubbleCellActions =
      visibleCellActions === undefined ? cellActions : cellActions.slice(0, visibleCellActions);
    return [
      ...bubbleCellActions.map((Action, idx) => ({
        id: `cell-action-${idx}`,
        element: <Action {...sharedActionProps} Component={CellActionIconButton} />,
      })),
      ...(isExpandable
        ? [
            {
              id: 'expand',
              element: (
                <EuiToolTip content={expandLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    // Same test subj as EuiDataGrid's expand button, so existing tests keep working.
                    data-test-subj={CELL_EXPAND_BUTTON_TEST_SUBJ}
                    iconType="maximize"
                    aria-label={expandLabel}
                    size="xs"
                    iconSize="s"
                    color="text"
                    display="empty"
                    onClick={onExpandClick}
                  />
                </EuiToolTip>
              ),
            },
          ]
        : []),
    ];
  }, [cellActions, visibleCellActions, isExpandable, colIndex, columnId, onExpandClick, rowIndex]);

  return (
    <>
      <div className={DATA_GRID_CELL_CONTENT_CLASS}>
        <CellValue
          renderCell={renderCell}
          row={row}
          rowIndex={rowIndex}
          columnId={columnId}
          colIndex={colIndex}
          setCellProps={setCellProps}
          isExpandable={isExpandable}
          isExpanded={isExpanded}
        />
      </div>
      {/* Separates the cells and rows when a selection is pasted into a spreadsheet. */}
      {isLastCopyColumn ? tabularCopyMarkers.hiddenNewline : tabularCopyMarkers.hiddenTab}
      {(isActive || isExpanded) && (
        <CellActionsBubble
          anchorCellRef={anchorRef}
          actions={actions}
          stayVisible={isExpanded}
          onTriggerActivate={isExpandable ? onActionsTriggerActivate : undefined}
        />
      )}
      {anchorRect && (
        <CellPopover
          column={column}
          row={row}
          rowIndex={rowIndex}
          colIndex={colIndex}
          anchorRect={anchorRect}
          anchorRef={anchorRef}
          isExpandable={isExpandable}
          closePopover={closeExpansion}
          renderCellPopover={renderCellPopover}
          showCloseButton={showCellPopoverCloseButton}
        />
      )}
    </>
  );
};

interface DataGridCellProps<TRow> {
  column: DataGridInternalColumn<TRow>;
  row: TRow;
  rowId: string;
  rowIndex: number;
  /** 1-based, matching `aria-colindex`. */
  colIndex: number;
  renderCellPopover?: DataGridProps<TRow>['renderCellPopover'];
  showCellPopoverCloseButton?: boolean;
  /** Set when this cell's expansion popover is open. */
  expandedAnchorRect?: DOMRect;
  onOpenExpansion: (cell: DataGridExpandedCell) => void;
  onCloseExpansion: (cell: DataGridCellKey) => void;
  styles: DataGridStyles;
  layout: ColumnLayout;
  getCellProps?: DataGridProps<TRow>['getCellProps'];
  /** Roving tabindex: only one cell of the grid is a tab stop. */
  isTabStop: boolean;
  /** Whether this is the last data cell of the row, which ends the row when copied as tabular text. */
  isLastCopyColumn: boolean;
}

export const getLayoutStyle = ({ width, sticky }: ColumnLayout): CSSProperties => ({
  width,
  ...(sticky && { [sticky.side]: sticky.offset }),
});

const DataGridCellComponent = <TRow,>({
  column,
  row,
  rowId,
  rowIndex,
  colIndex,
  renderCellPopover,
  showCellPopoverCloseButton,
  expandedAnchorRect,
  onOpenExpansion,
  onCloseExpansion,
  styles,
  layout,
  getCellProps,
  isTabStop,
  isLastCopyColumn,
}: DataGridCellProps<TRow>) => {
  // Hovered or focused. Tracked separately: a focus trap pulling focus away (e.g. another cell's open
  // popover) must not unmount the actions under the pointer, or a click on them is lost.
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const { id: columnId, isControl, cellCss, renderCell } = column;
  const isInteractive = !isControl;
  // Attributes the content of the cell sets on it, e.g. a color for its value.
  const [dynamicProps, setDynamicProps] = useState<DataGridSetCellProps>({});
  const setCellProps = useCallback(
    (next: DataGridSetCellProps) => setDynamicProps((prev) => (isEqual(prev, next) ? prev : next)),
    []
  );
  const expansion = useCellExpansion({
    cellRef,
    rowId,
    columnId,
    anchorRect: expandedAnchorRect,
    onOpenExpansion,
    onCloseExpansion,
  });
  const { open: openExpansion } = expansion;
  const {
    css: extraCss,
    className,
    'data-test-subj': dataTestSubj,
    attributes,
  } = getCellProps?.({ row, rowIndex, columnId }) ?? {};

  const style = useMemo(
    () => ({ ...dynamicProps.style, ...getLayoutStyle(layout) }),
    [dynamicProps.style, layout]
  );

  const onMouseEnter = useCallback(() => setIsHovered(true), []);
  const onMouseLeave = useCallback(() => setIsHovered(false), []);
  const onFocus = useCallback(() => setHasFocus(true), []);
  const onBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setHasFocus(false);
    }
  }, []);
  // Like EuiDataGrid, Enter or F2 on the focused cell opens its popover under the expand icon.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget &&
        (event.key === keys.ENTER || event.key === keys.F2)
      ) {
        event.preventDefault();
        const cell = event.currentTarget;
        // Prefer the expand icon when the actions toolbar is open; otherwise the collapsed
        // trigger sits in the same corner and is the correct popover anchor.
        const expandAnchor =
          cell.querySelector<HTMLElement>(`[data-test-subj="${CELL_EXPAND_BUTTON_TEST_SUBJ}"]`) ??
          cell.querySelector<HTMLElement>(`[data-test-subj="${CELL_ACTIONS_TRIGGER_TEST_SUBJ}"]`);
        openExpansion(expandAnchor ?? cell);
      }
    },
    [openExpansion]
  );

  // Control cells: Enter or F2 moves focus into the content, Escape returns it to the cell.
  const onControlKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const cell = event.currentTarget;
    if (event.target === cell && (event.key === keys.ENTER || event.key === keys.F2)) {
      const firstTabbable = enterCellContent(cell);
      if (firstTabbable) {
        event.preventDefault();
        firstTabbable.focus();
      } else {
        exitCellContent(cell);
      }
      return;
    }
    if (event.target !== cell && event.key === keys.ESCAPE) {
      event.preventDefault();
      exitCellContent(cell);
      cell.focus();
    }
  }, []);
  const onControlBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      exitCellContent(event.currentTarget);
    }
  }, []);

  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-colindex={colIndex}
      data-gridcell-column-id={columnId}
      data-sticky-side={layout.sticky?.side}
      {...attributes}
      data-test-subj={dynamicProps['data-test-subj'] ?? dataTestSubj}
      className={classNames(className, dynamicProps.className)}
      tabIndex={isTabStop ? 0 : -1}
      onMouseEnter={isInteractive ? onMouseEnter : undefined}
      onMouseLeave={isInteractive ? onMouseLeave : undefined}
      onFocus={isInteractive ? onFocus : undefined}
      onBlur={isInteractive ? onBlur : onControlBlur}
      onKeyDown={isInteractive ? onKeyDown : onControlKeyDown}
      css={[
        styles.cell,
        isInteractive && styles.cellWithActions,
        layout.sticky && styles.cellSticky,
        layout.sticky?.isEdge && styles.cellStickyEdge,
        isControl && styles.cellNoSelect,
        isControl && styles.cellControl,
        isControl && styles.cellControlBody,
        cellCss,
        extraCss,
      ]}
      style={style}
    >
      {isInteractive ? (
        <CellContent
          column={column}
          row={row}
          rowIndex={rowIndex}
          colIndex={colIndex - 1}
          isActive={isHovered || hasFocus}
          anchorRef={cellRef}
          expansion={expansion}
          setCellProps={setCellProps}
          isLastCopyColumn={isLastCopyColumn}
          renderCellPopover={renderCellPopover}
          showCellPopoverCloseButton={showCellPopoverCloseButton}
        />
      ) : (
        <>
          {tabularCopyMarkers.hiddenNoCopyBoundary}
          <div css={styles.cellControlContent}>
            <CellValue
              renderCell={renderCell}
              row={row}
              rowIndex={rowIndex}
              columnId={columnId}
              colIndex={colIndex - 1}
              setCellProps={setCellProps}
              isExpandable={false}
              isExpanded={false}
            />
          </div>
          {tabularCopyMarkers.hiddenNoCopyBoundary}
        </>
      )}
    </div>
  );
};

const shallowEqualArrays = <T,>(a: T[] | undefined, b: T[] | undefined) =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.every((item, i) => item === b[i]));

/**
 * What a cell renders with of its column. The consumer builds its columns anew for a sort or a
 * width, the cell only needs to render again when something it uses changed, not for the header.
 */
const areCellColumnsEqual = <TRow,>(
  a: DataGridInternalColumn<TRow>,
  b: DataGridInternalColumn<TRow>
) =>
  a === b ||
  (a.id === b.id &&
    a.isControl === b.isControl &&
    a.isExpandable === b.isExpandable &&
    a.visibleCellActions === b.visibleCellActions &&
    a.cellCss === b.cellCss &&
    a.renderCell === b.renderCell &&
    a.renderCellExpansionFooter === b.renderCellExpansionFooter &&
    shallowEqualArrays(a.cellActions, b.cellActions));

const areCellPropsEqual = <TRow,>(
  { column: prevColumn, ...prevRest }: DataGridCellProps<TRow>,
  { column: nextColumn, ...nextRest }: DataGridCellProps<TRow>
) =>
  areCellColumnsEqual(prevColumn, nextColumn) &&
  (Object.keys(prevRest) as Array<keyof typeof prevRest>).every(
    (key) => prevRest[key] === nextRest[key]
  );

export const DataGridCell = memo(
  DataGridCellComponent,
  areCellPropsEqual
) as typeof DataGridCellComponent;
