/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FocusEvent, KeyboardEvent, MouseEvent, RefObject } from 'react';
import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flexRender, type Cell, type Row } from '@tanstack/react-table';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { CellActionsBubbleAction } from '@kbn/unified-data-table';
import { CellActionsBubble } from '@kbn/unified-data-table';
import type { FieldRow } from './field_row';
import { TableCell } from './table_cell';
import {
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from './table_cell_actions';
import type { UseTableFiltersCallbacksReturn } from './table_filters';
import { GRID_COLUMN_FIELD_VALUE } from './table_grid_constants';
import type { GRID_COLUMN_FIELD_NAME } from './table_grid_constants';
import { PIN_COLUMN_ID } from './tanstack_table_grid_constants';
import type { TableStyles } from './tanstack_table_grid_styles';
import { getPopoverAnchorStyles, popoverContentStyles } from './tanstack_table_grid_styles';

type FieldColumnId = typeof GRID_COLUMN_FIELD_NAME | typeof GRID_COLUMN_FIELD_VALUE;

/** Data shared by all field table cells, provided once by the grid instead of through column closures. */
export interface FieldTableData {
  rows: FieldRow[];
  searchTerm?: string;
  isEsqlMode: boolean;
  onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
  filter?: DocViewFilterFn;
  hideFilteringOnComputedColumns?: boolean;
  fieldCellActions: EuiDataGridColumnCellAction[];
  fieldValueCellActions: EuiDataGridColumnCellAction[];
}

export const FieldTableDataContext = createContext<FieldTableData | null>(null);

const useFieldTableData = () => {
  const data = useContext(FieldTableDataContext);
  if (!data) {
    throw new Error('FieldTableCell must be rendered inside a FieldTableDataContext provider');
  }
  return data;
};

interface CellExpansion {
  /** Viewport rect of what opened the expansion popover; undefined while it is closed. */
  anchorRect?: DOMRect;
  open: (anchor?: HTMLElement | null) => void;
  close: () => void;
}

interface GridCellContextValue {
  // Whether the cell is hovered or focused, so the comparatively heavy cell actions only mount for it.
  isActive: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
  expansion: CellExpansion;
}

const GridCellContext = createContext<GridCellContextValue | null>(null);

const useGridCell = () => {
  const context = useContext(GridCellContext);
  if (!context) {
    throw new Error('FieldTableCell must be rendered inside a GridCell');
  }
  return context;
};

const useCellExpansion = (cellRef: RefObject<HTMLDivElement | null>): CellExpansion => {
  const [anchorRect, setAnchorRect] = useState<DOMRect>();
  const isOpen = anchorRect !== undefined;

  const open = useCallback(
    (anchor?: HTMLElement | null) => {
      const cell = cellRef.current;
      // Focus the cell first, so the popover's focus trap returns focus to it when it closes.
      cell?.focus({ preventScroll: true });
      const rect = (anchor ?? cell)?.getBoundingClientRect();
      if (rect) {
        setAnchorRect(rect);
      }
    },
    [cellRef]
  );
  const close = useCallback(() => setAnchorRect(undefined), []);

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

const CellActionPopoverButton: typeof EuiButtonEmpty = (props) => (
  <EuiButtonEmpty {...props} size="s" />
);

interface FieldTableCellProps {
  rowIndex: number;
  colIndex: number;
  columnId: FieldColumnId;
}

export const FieldTableCell = memo(({ rowIndex, colIndex, columnId }: FieldTableCellProps) => {
  const {
    rows,
    searchTerm,
    isEsqlMode,
    onFindSearchTermMatch,
    filter,
    hideFilteringOnComputedColumns,
    fieldCellActions,
    fieldValueCellActions,
  } = useFieldTableData();
  const { isActive, anchorRef, expansion } = useGridCell();
  const { anchorRect, open: openExpansion, close: closeExpansion } = expansion;
  const isExpanded = anchorRect !== undefined;
  const cellActions =
    columnId === GRID_COLUMN_FIELD_VALUE ? fieldValueCellActions : fieldCellActions;

  const row = rows[rowIndex];
  const warningMessage = useMemo(() => {
    if (!isExpanded) {
      return undefined;
    }
    const params = { row, onFilter: filter, hideFilteringOnComputedColumns };
    return columnId === GRID_COLUMN_FIELD_VALUE
      ? getFilterInOutPairDisabledWarning(params)
      : getFilterExistsDisabledWarning(params);
  }, [isExpanded, row, filter, hideFilteringOnComputedColumns, columnId]);

  const expandLabel = i18n.translate('unifiedDocViewer.fieldsTable.expandCellLabel', {
    defaultMessage: 'Expand cell',
  });

  const onExpandClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => openExpansion(event.currentTarget),
    [openExpansion]
  );

  const actions = useMemo<CellActionsBubbleAction[]>(() => {
    const sharedActionProps = {
      rowIndex,
      colIndex,
      columnId,
      isExpanded: false as const,
    };
    return [
      ...cellActions.map((Action, idx) => ({
        id: `cell-action-${idx}`,
        element: <Action {...sharedActionProps} Component={CellActionIconButton} />,
      })),
      {
        id: 'expand',
        element: (
          <EuiToolTip content={expandLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              // Same test subj as EuiDataGrid's expand button, so existing tests keep working.
              data-test-subj="euiDataGridCellExpandButton"
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
    ];
  }, [cellActions, colIndex, columnId, expandLabel, onExpandClick, rowIndex]);

  const cellContentProps = {
    searchTerm: searchTerm || '',
    rows,
    rowIndex,
    columnId,
    isESQLMode: isEsqlMode,
    onFindSearchTermMatch,
  };

  return (
    <>
      <TableCell {...cellContentProps} isDetails={false} />
      {(isActive || isExpanded) && (
        <CellActionsBubble anchorCellRef={anchorRef} actions={actions} stayVisible={isExpanded} />
      )}
      {anchorRect && (
        <EuiPortal>
          <EuiPopover
            css={getPopoverAnchorStyles(anchorRect)}
            isOpen
            ownFocus
            closePopover={closeExpansion}
            anchorPosition="downRight"
            aria-label={i18n.translate('unifiedDocViewer.fieldsTable.cellPopoverAriaLabel', {
              defaultMessage: 'Cell details',
            })}
            panelPaddingSize="s"
            // Same test subj as EuiDataGrid's expansion popover, so existing tests keep working.
            panelProps={{ 'data-test-subj': 'euiDataGridExpansionPopover' }}
            button={<span aria-hidden="true" />}
          >
            <EuiText size="s" css={popoverContentStyles}>
              <TableCell {...cellContentProps} isDetails />
            </EuiText>
            {cellActions.length > 0 && (
              <EuiPopoverFooter>
                <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                  {cellActions.map((Action, idx) => (
                    <EuiFlexItem key={idx} grow={false}>
                      <Action
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        columnId={columnId}
                        Component={CellActionPopoverButton}
                        isExpanded
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPopoverFooter>
            )}
            {Boolean(warningMessage) && (
              <div>
                <EuiSpacer size="xs" />
                <KbnWarningCallout announceOnMount={false} title={warningMessage} size="s" />
              </div>
            )}
          </EuiPopover>
        </EuiPortal>
      )}
    </>
  );
});

export const getColumnCss = (styles: TableStyles, columnId: string) => {
  if (columnId === GRID_COLUMN_FIELD_VALUE) {
    return styles.valueColumn;
  }
  return columnId === PIN_COLUMN_ID ? styles.pinColumn : styles.nameColumn;
};

interface GridCellProps {
  cell: Cell<FieldRow, unknown>;
  styles: TableStyles;
  /** Roving tabindex: only one cell of the grid is a tab stop. */
  isTabStop: boolean;
}

export const GridCell = memo(({ cell, styles, isTabStop }: GridCellProps) => {
  const [isActive, setIsActive] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const expansion = useCellExpansion(cellRef);
  const { open: openExpansion } = expansion;
  const { id: columnId } = cell.column;
  const hasActions = columnId !== PIN_COLUMN_ID;

  const onActivate = useCallback(() => setIsActive(true), []);
  const onDeactivate = useCallback(() => setIsActive(false), []);
  const onBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsActive(false);
    }
  }, []);
  // Like EuiDataGrid, Enter or F2 on the focused cell opens its popover.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget &&
        (event.key === keys.ENTER || event.key === keys.F2)
      ) {
        event.preventDefault();
        openExpansion(event.currentTarget);
      }
    },
    [openExpansion]
  );

  const contextValue = useMemo(
    () => ({ isActive, anchorRef: cellRef, expansion }),
    [isActive, expansion]
  );

  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-colindex={cell.column.getIndex() + 1}
      data-gridcell-column-id={columnId}
      tabIndex={isTabStop ? 0 : -1}
      onMouseEnter={hasActions ? onActivate : undefined}
      onMouseLeave={hasActions ? onDeactivate : undefined}
      onFocus={hasActions ? onActivate : undefined}
      onBlur={hasActions ? onBlur : undefined}
      onKeyDown={hasActions ? onKeyDown : undefined}
      css={[styles.cell, hasActions && styles.cellWithActions, getColumnCss(styles, columnId)]}
    >
      <GridCellContext.Provider value={contextValue}>
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </GridCellContext.Provider>
    </div>
  );
});

interface GridRowProps {
  row: Row<FieldRow>;
  ariaRowIndex: number;
  isStriped: boolean;
  styles: TableStyles;
  /** Column index (1-based) of the grid's tab stop when it is in this row. */
  tabStopColIndex?: number;
  // Set for virtualized rows, so the virtualizer can measure their auto height.
  virtualIndex?: number;
  measureElement?: Virtualizer<HTMLDivElement, Element>['measureElement'];
}

export const GridRow = memo(
  ({
    row,
    ariaRowIndex,
    isStriped,
    styles,
    tabStopColIndex,
    virtualIndex,
    measureElement,
  }: GridRowProps) => (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      className="kbnDocViewer__tanStackRow"
      css={[styles.row, isStriped && styles.rowStriped]}
    >
      {row.getVisibleCells().map((cell) => (
        <GridCell
          key={cell.id}
          cell={cell}
          styles={styles}
          isTabStop={cell.column.getIndex() + 1 === tabStopColIndex}
        />
      ))}
    </div>
  )
);
