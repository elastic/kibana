/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FocusEvent, KeyboardEvent, MouseEvent, RefObject } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SerializedStyles } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPortal,
  EuiText,
  EuiToolTip,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CELL_ACTIONS_TRIGGER_TEST_SUBJ,
  CELL_EXPANSION_CLOSE_TEST_SUBJ,
  CELL_EXPANSION_POPOVER_TEST_SUBJ,
  CELL_EXPAND_BUTTON_TEST_SUBJ,
} from '../constants';
import type { DataGridStyles } from '../styles';
import { getPopoverAnchorStyles, popoverContentStyles } from '../styles';
import type { DataGridInternalColumn, DataGridProps } from '../types';
import type { CellActionsBubbleAction } from './cell_actions_bubble/cell_actions_bubble';
import { CellActionsBubble } from './cell_actions_bubble/cell_actions_bubble';

interface CellExpansion {
  /** Viewport rect of what opened the expansion popover; undefined while it is closed. */
  anchorRect?: DOMRect;
  open: (anchor?: HTMLElement | null) => void;
  close: () => void;
}

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

interface CellContentProps<TRow> {
  column: DataGridInternalColumn<TRow>;
  row: TRow;
  rowIndex: number;
  colIndex: number;
  // Whether the cell is hovered or focused, so the comparatively heavy cell actions only mount for it.
  isActive: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
  expansion: CellExpansion;
}

const CellContent = <TRow,>({
  column,
  row,
  rowIndex,
  colIndex,
  isActive,
  anchorRef,
  expansion,
}: CellContentProps<TRow>) => {
  const { id: columnId, cellActions = [], renderCell, renderCellExpansionFooter } = column;
  const { anchorRect, open: openExpansion, close: closeExpansion } = expansion;
  const isExpanded = anchorRect !== undefined;

  const expandLabel = i18n.translate('kbnDataGrid.cell.expandLabel', {
    defaultMessage: 'Expand cell',
  });
  const closePopoverLabel = i18n.translate('kbnDataGrid.cell.closePopoverLabel', {
    defaultMessage: 'Close popover',
  });

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
    ];
  }, [cellActions, colIndex, columnId, expandLabel, onExpandClick, rowIndex]);

  return (
    <>
      {renderCell({ row, rowIndex, columnId, isDetails: false })}
      {(isActive || isExpanded) && (
        <CellActionsBubble
          anchorCellRef={anchorRef}
          actions={actions}
          stayVisible={isExpanded}
          onTriggerActivate={onActionsTriggerActivate}
        />
      )}
      {anchorRect && (
        <EuiPortal>
          <EuiPopover
            css={getPopoverAnchorStyles(anchorRect)}
            isOpen
            ownFocus
            closePopover={closeExpansion}
            anchorPosition="downRight"
            aria-label={i18n.translate('kbnDataGrid.cell.popoverAriaLabel', {
              defaultMessage: 'Cell details',
            })}
            panelPaddingSize="s"
            // Same test subj as EuiDataGrid's expansion popover, so existing tests keep working.
            panelProps={{ 'data-test-subj': CELL_EXPANSION_POPOVER_TEST_SUBJ }}
            button={<span aria-hidden="true" />}
          >
            <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexStart">
              <EuiFlexItem>
                <EuiText size="s" css={popoverContentStyles}>
                  {renderCell({ row, rowIndex, columnId, isDetails: true })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={closePopoverLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    aria-label={closePopoverLabel}
                    data-test-subj={CELL_EXPANSION_CLOSE_TEST_SUBJ}
                    iconType="cross"
                    iconSize="s"
                    size="xs"
                    color="text"
                    onClick={closeExpansion}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
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
            {renderCellExpansionFooter?.(row)}
          </EuiPopover>
        </EuiPortal>
      )}
    </>
  );
};

interface DataGridCellProps<TRow> {
  column: DataGridInternalColumn<TRow>;
  row: TRow;
  rowIndex: number;
  /** 1-based, matching `aria-colindex`. */
  colIndex: number;
  styles: DataGridStyles;
  layoutCss: SerializedStyles;
  getCellProps?: DataGridProps<TRow>['getCellProps'];
  /** Roving tabindex: only one cell of the grid is a tab stop. */
  isTabStop: boolean;
}

const DataGridCellComponent = <TRow,>({
  column,
  row,
  rowIndex,
  colIndex,
  styles,
  layoutCss,
  getCellProps,
  isTabStop,
}: DataGridCellProps<TRow>) => {
  const [isActive, setIsActive] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const expansion = useCellExpansion(cellRef);
  const { open: openExpansion } = expansion;
  const { id: columnId, isControl, cellCss, renderCell } = column;
  const isInteractive = !isControl;
  const {
    css: extraCss,
    className,
    'data-test-subj': dataTestSubj,
  } = getCellProps?.({ row, rowIndex, columnId }) ?? {};

  const onActivate = useCallback(() => setIsActive(true), []);
  const onDeactivate = useCallback(() => setIsActive(false), []);
  const onBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsActive(false);
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

  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-colindex={colIndex}
      data-gridcell-column-id={columnId}
      data-test-subj={dataTestSubj}
      className={className}
      tabIndex={isTabStop ? 0 : -1}
      onMouseEnter={isInteractive ? onActivate : undefined}
      onMouseLeave={isInteractive ? onDeactivate : undefined}
      onFocus={isInteractive ? onActivate : undefined}
      onBlur={isInteractive ? onBlur : undefined}
      onKeyDown={isInteractive ? onKeyDown : undefined}
      css={[styles.cell, isInteractive && styles.cellWithActions, layoutCss, cellCss, extraCss]}
    >
      {isInteractive ? (
        <CellContent
          column={column}
          row={row}
          rowIndex={rowIndex}
          colIndex={colIndex}
          isActive={isActive}
          anchorRef={cellRef}
          expansion={expansion}
        />
      ) : (
        renderCell({ row, rowIndex, columnId, isDetails: false })
      )}
    </div>
  );
};

export const DataGridCell = memo(DataGridCellComponent) as typeof DataGridCellComponent;
