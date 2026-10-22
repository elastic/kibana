/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import type { EuiButtonEmpty } from '@elastic/eui';
import {
  EuiButtonEmpty as EuiButtonEmptyComponent,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPortal,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  CELL_EXPANSION_CLOSE_TEST_SUBJ,
  CELL_EXPANSION_POPOVER_TEST_SUBJ,
  DATA_GRID_CELL_CONTENT_CLASS,
} from '../constants';
import { getPopoverAnchorStyles, popoverContentStyles } from '../styles';
import type { DataGridInternalColumn, DataGridPopoverProps, DataGridProps } from '../types';

const CellActionPopoverButton: typeof EuiButtonEmpty = (props) => (
  <EuiButtonEmptyComponent {...props} size="s" />
);

interface CellPopoverProps<TRow> {
  column: DataGridInternalColumn<TRow>;
  row: TRow;
  rowIndex: number;
  /** Position of the column among all columns, starting at 0. */
  colIndex: number;
  /** Viewport rect of what opened the popover. */
  anchorRect: DOMRect;
  anchorRef: RefObject<HTMLElement | null>;
  isExpandable: boolean;
  closePopover: () => void;
  renderCellPopover?: DataGridProps<TRow>['renderCellPopover'];
  showCloseButton: boolean;
}

/**
 * The popover of an expanded cell. A component of its own, so cells that are not expanded (nearly
 * all of them) do not build any of it.
 */
export const CellPopover = <TRow,>({
  column,
  row,
  rowIndex,
  colIndex,
  anchorRect,
  anchorRef,
  isExpandable,
  closePopover,
  renderCellPopover,
  showCloseButton,
}: CellPopoverProps<TRow>) => {
  const { id: columnId, cellActions = [], renderCell, renderCellExpansionFooter } = column;
  const [popoverProps, setPopoverProps] = useState<DataGridPopoverProps>({});
  // Renderers set the props of the panel from effects, often with new but equal objects: stay
  // stable and ignore equal props, or they set state in a loop.
  const updatePopoverProps = useCallback(
    (next: DataGridPopoverProps) => setPopoverProps((prev) => (isEqual(prev, next) ? prev : next)),
    []
  );

  const popoverContent = (
    <EuiText size="s" css={popoverContentStyles}>
      {renderCell({
        row,
        rowIndex,
        columnId,
        colIndex,
        isDetails: true,
        setCellProps: noopSetCellProps,
        isExpandable,
        isExpanded: true,
      })}
    </EuiText>
  );
  const popoverFooter = (
    <>
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
    </>
  );

  const closePopoverLabel = i18n.translate('kbnDataGrid.cell.closePopoverLabel', {
    defaultMessage: 'Close popover',
  });
  const defaultPopoverBody = (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexStart">
        <EuiFlexItem>{popoverContent}</EuiFlexItem>
        {showCloseButton && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={closePopoverLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={closePopoverLabel}
                data-test-subj={CELL_EXPANSION_CLOSE_TEST_SUBJ}
                iconType="cross"
                iconSize="s"
                size="xs"
                color="text"
                onClick={closePopover}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {popoverFooter}
    </>
  );

  // A stable component, so a custom popover does not remount its content on every render.
  const defaultPopoverBodyRef = useRef(defaultPopoverBody);
  defaultPopoverBodyRef.current = defaultPopoverBody;
  const DefaultPopoverContent = useCallback(() => <>{defaultPopoverBodyRef.current}</>, []);

  return (
    <EuiPortal>
      <EuiPopover
        css={getPopoverAnchorStyles(anchorRect)}
        isOpen
        ownFocus
        closePopover={closePopover}
        anchorPosition="downRight"
        aria-label={i18n.translate('kbnDataGrid.cell.popoverAriaLabel', {
          defaultMessage: 'Cell details',
        })}
        panelPaddingSize="s"
        panelClassName={popoverProps.panelClassName}
        // Same test subj as EuiDataGrid's expansion popover, so existing tests keep working.
        panelProps={{
          'data-test-subj': CELL_EXPANSION_POPOVER_TEST_SUBJ,
          ...popoverProps.panelProps,
        }}
        button={<span aria-hidden="true" />}
      >
        {renderCellPopover
          ? renderCellPopover({
              row,
              rowIndex,
              columnId,
              colIndex,
              children: popoverContent,
              cellContentElement:
                anchorRef.current?.querySelector<HTMLElement>(`.${DATA_GRID_CELL_CONTENT_CLASS}`) ??
                null,
              cellActions: popoverFooter,
              closePopover,
              setPopoverProps: updatePopoverProps,
              DefaultPopoverContent,
            })
          : defaultPopoverBody}
      </EuiPopover>
    </EuiPortal>
  );
};

const noopSetCellProps = () => {};
