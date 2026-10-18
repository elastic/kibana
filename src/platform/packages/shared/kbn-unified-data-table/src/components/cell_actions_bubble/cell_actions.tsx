/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import React from 'react';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiToolTip,
} from '@elastic/eui';
import type { CellActionsBubbleAction } from './cell_actions_bubble';

export const EXPAND_CELL_TEST_SUBJ = 'euiDataGridCellExpandButton';

/** The cell the cell actions belong to. */
export interface CellActionTarget {
  rowIndex: number;
  colIndex: number;
  columnId: string;
}

/** The icon variant of an EuiDataGrid style cell action, shown in the cell actions bubble. */
export const CellActionIconButton: typeof EuiButtonIcon = ({
  children,
  title,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const label =
    ariaLabel ??
    (typeof children === 'string' ? children : undefined) ??
    (typeof title === 'string' ? title : undefined);
  // An icon-only button without an accessible name is unusable for assistive technology.
  if (!label) {
    return null;
  }
  return (
    <EuiToolTip content={title ?? children ?? label} disableScreenReaderOutput>
      <EuiButtonIcon {...rest} aria-label={label} size="xs" iconSize="s" color="text" />
    </EuiToolTip>
  );
};

/** The labelled variant of an EuiDataGrid style cell action, shown in the cell popover footer. */
export const CellActionPopoverButton: typeof EuiButtonEmpty = (props) => (
  <EuiButtonEmpty {...props} size="s" />
);

interface CellActionBubbleActionsParams {
  cellActions: EuiDataGridColumnCellAction[];
  cell: CellActionTarget;
  /** The expand button, which is only added when the cell can be expanded. */
  expand?: { label: string; onExpand: (trigger: HTMLElement) => void };
}

/** The actions of a cell for its actions bubble: its cell actions, followed by an expand button. */
export const getCellActionBubbleActions = ({
  cellActions,
  cell: { rowIndex, colIndex, columnId },
  expand,
}: CellActionBubbleActionsParams): CellActionsBubbleAction[] => {
  const actions: CellActionsBubbleAction[] = cellActions.map((Action, index) => ({
    id: `cell-action-${index}`,
    element: (
      <Action
        rowIndex={rowIndex}
        colIndex={colIndex}
        columnId={columnId}
        Component={CellActionIconButton}
        isExpanded={false}
      />
    ),
  }));
  if (expand) {
    actions.push({
      id: 'expand',
      element: (
        <EuiToolTip content={expand.label} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={EXPAND_CELL_TEST_SUBJ}
            iconType="maximize"
            aria-label={expand.label}
            size="xs"
            iconSize="s"
            color="text"
            display="empty"
            onClick={(event: MouseEvent<HTMLButtonElement>) => expand.onExpand(event.currentTarget)}
          />
        </EuiToolTip>
      ),
    });
  }
  return actions;
};

interface CellActionsPopoverFooterProps {
  cellActions: EuiDataGridColumnCellAction[];
  cell: CellActionTarget;
  /** Called after an enabled action has run, e.g. to close the popover. */
  onActionClick?: () => void;
}

/** The cell actions of a cell as labelled buttons, for the footer of its popover. */
export const CellActionsPopoverFooter = ({
  cellActions,
  cell: { rowIndex, colIndex, columnId },
  onActionClick,
}: CellActionsPopoverFooterProps) =>
  cellActions.length > 0 ? (
    <EuiPopoverFooter
      onClick={(event) => {
        // The click handlers of the actions run first, as the event bubbles up to here.
        if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) {
          onActionClick?.();
        }
      }}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        {cellActions.map((Action, index) => (
          <EuiFlexItem key={index} grow={false}>
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
  ) : null;
