/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopoverFooter,
  EuiPortal,
  EuiToolTip,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SOURCE_COLUMN,
  TanStackCellActionsBubble,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import type { getTanStackDataGridStyles } from './tanstack_data_grid.styles';

export const CellActions = React.memo(
  ({
    fieldName,
    value,
    formattedValue,
    onFilter,
    onExpand,
    onDismiss,
    anchorCellRef,
    styles,
  }: {
    fieldName: string;
    value: unknown;
    formattedValue: string;
    onFilter?: UnifiedDataTableProps['onFilter'];
    onExpand: (cellElement: HTMLElement) => void;
    onDismiss: () => void;
    anchorCellRef: React.RefObject<HTMLDivElement | null>;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const handleFilterIn = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilter?.(fieldName, value, '+');
        onDismiss();
      },
      [onFilter, fieldName, value, onDismiss]
    );
    const handleFilterOut = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilter?.(fieldName, value, '-');
        onDismiss();
      },
      [onFilter, fieldName, value, onDismiss]
    );
    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(formattedValue);
        onDismiss();
      },
      [formattedValue, onDismiss]
    );
    const handleExpand = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        const cellElement = e.currentTarget.closest<HTMLElement>('[role="gridcell"]');
        if (cellElement) onExpand(cellElement);
        onDismiss();
      },
      [onExpand, onDismiss]
    );
    const cellActionsLabel = i18n.translate('discover.grid.tanStack.cellActionsButtonAriaLabel', {
      defaultMessage: 'Cell actions',
    });
    const filterForLabel = i18n.translate('discover.grid.tanStack.filterForValueAriaLabel', {
      defaultMessage: 'Filter for value',
    });
    const filterOutLabel = i18n.translate('discover.grid.tanStack.filterOutValueAriaLabel', {
      defaultMessage: 'Filter out value',
    });
    const copyValueLabel = i18n.translate('discover.grid.tanStack.copyCellValueAriaLabel', {
      defaultMessage: 'Copy value',
    });
    const expandCellLabel = i18n.translate('discover.grid.tanStack.expandCellValueAriaLabel', {
      defaultMessage: 'Expand cell',
    });

    const actionButtons = [
      onFilter ? (
        <EuiToolTip key="filterIn" content={filterForLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            css={styles.cellActionButton}
            iconType="plusCircle"
            aria-label={filterForLabel}
            size="xs"
            iconSize="s"
            color="text"
            display="empty"
            onClick={handleFilterIn}
            data-test-subj="filterForValue"
          />
        </EuiToolTip>
      ) : null,
      onFilter ? (
        <EuiToolTip key="filterOut" content={filterOutLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            css={styles.cellActionButton}
            iconType="minusCircle"
            aria-label={filterOutLabel}
            size="xs"
            iconSize="s"
            color="text"
            display="empty"
            onClick={handleFilterOut}
            data-test-subj="filterOutValue"
          />
        </EuiToolTip>
      ) : null,
      <EuiToolTip key="copy" content={copyValueLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          css={styles.cellActionButton}
          iconType="copy"
          aria-label={copyValueLabel}
          size="xs"
          iconSize="s"
          color="text"
          display="empty"
          onClick={handleCopy}
          data-test-subj="copyCellValue"
        />
      </EuiToolTip>,
      <EuiToolTip key="expand" content={expandCellLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          css={styles.cellActionButton}
          iconType="maximize"
          aria-label={expandCellLabel}
          size="xs"
          iconSize="s"
          color="text"
          display="empty"
          onClick={handleExpand}
          data-test-subj="expandCellValue"
        />
      </EuiToolTip>,
    ].filter((button): button is React.ReactElement => button != null);

    return (
      <TanStackCellActionsBubble
        anchorCellRef={anchorCellRef}
        actionButtons={actionButtons}
        toolbarAriaLabel={cellActionsLabel}
      />
    );
  }
);

// Matches EuiDataGrid cell popover sizing inputs (cell width drives maxInlineSize).
export interface CellPopoverState {
  fieldName: string;
  value: unknown;
  formattedValue: string;
  cellElement: HTMLElement;
  cellWidth: number;
}

export type SetCellPopoverState = (state: CellPopoverState | null) => void;

// ── Cell Popover (ported panel — same dimensions as EuiDataGrid) ──
const CellPopover = React.memo(
  ({
    fieldName,
    value,
    formattedValue,
    cellElement,
    cellWidth,
    onClose,
    onFilter,
    styles,
  }: CellPopoverState & {
    onClose: () => void;
    onFilter?: UnifiedDataTableProps['onFilter'];
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const isWidePopover = fieldName === SOURCE_COLUMN;
    const cellRect = cellElement.getBoundingClientRect();

    const maxInlineSize = isWidePopover
      ? Math.min(window.innerWidth * 0.75, 600)
      : Math.min(window.innerWidth * 0.75, Math.max(cellWidth, 400));
    const maxBlockSize = window.innerHeight * 0.5;

    // Prefer below the cell; flip above when there isn't enough room.
    const spaceBelow = window.innerHeight - cellRect.bottom - 8;
    const openAbove = spaceBelow < Math.min(160, maxBlockSize) && cellRect.top > spaceBelow;
    const left = Math.max(8, Math.min(cellRect.left, window.innerWidth - maxInlineSize - 8));

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === keys.F2 || event.key === keys.ESCAPE) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          requestAnimationFrame(() => cellElement.focus());
        }
      };
      document.addEventListener('keydown', onKeyDown, true);
      return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [cellElement, onClose]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(formattedValue);
    }, [formattedValue]);

    const handleFilterIn = useCallback(() => {
      onFilter?.(fieldName, value, '+');
      onClose();
    }, [onFilter, fieldName, value, onClose]);

    const handleFilterOut = useCallback(() => {
      onFilter?.(fieldName, value, '-');
      onClose();
    }, [onFilter, fieldName, value, onClose]);

    const handleBackdropClick = useCallback(
      (event: React.MouseEvent) => {
        const cellActions = cellElement.querySelector('.tsg-cellActions');
        if (cellActions?.contains(event.target as Node)) {
          return;
        }
        onClose();
      },
      [cellElement, onClose]
    );

    const closeLabel = i18n.translate('discover.grid.tanStack.closePopover', {
      defaultMessage: 'Close popover',
    });

    const panelStyle = useMemo(
      () => ({
        position: 'fixed' as const,
        left,
        maxInlineSize,
        maxBlockSize,
        width: 'max-content' as const,
        minWidth: Math.min(cellWidth, maxInlineSize),
        zIndex: 10000,
        ...(openAbove
          ? { bottom: window.innerHeight - cellRect.top, top: 'auto' as const }
          : { top: cellRect.bottom, bottom: 'auto' as const }),
      }),
      [left, maxInlineSize, maxBlockSize, cellWidth, openAbove, cellRect.top, cellRect.bottom]
    );

    return (
      <EuiPortal>
        <div
          css={styles.cellPopoverBackdrop}
          onClick={handleBackdropClick}
          onKeyDown={(event) => {
            if (event.key === keys.ENTER || event.key === keys.SPACE || event.key === keys.ESCAPE) {
              event.preventDefault();
              onClose();
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label={closeLabel}
        />
        <EuiPanel
          paddingSize="s"
          hasShadow
          data-test-subj="euiDataGridExpansionPopover"
          className="euiDataGridRowCell__popover unifiedDataTable__cellPopover"
          css={[styles.cellPopoverPanel, isWidePopover && styles.cellPopoverPanelWide]}
          style={panelStyle}
          role="dialog"
          aria-label={i18n.translate('discover.grid.tanStack.cellPopoverAriaLabel', {
            defaultMessage: '{fieldName} value',
            values: { fieldName },
          })}
        >
          <EuiFlexGroup
            gutterSize="none"
            direction="row"
            responsive={false}
            data-test-subj="dataTableExpandCellActionPopover"
          >
            <EuiFlexItem>
              <div
                className="unifiedDataTable__cellPopoverValue eui-textBreakWord"
                css={styles.cellPopoverValue}
                data-test-subj="dataTableExpandCellActionPopoverValue"
                tabIndex={0}
              >
                {formattedValue}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={closeLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={closeLabel}
                  data-test-subj="docTableClosePopover"
                  iconSize="s"
                  iconType="cross"
                  size="xs"
                  onClick={onClose}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiPopoverFooter>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {onFilter && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty iconType="plusCircle" size="s" onClick={handleFilterIn}>
                      {i18n.translate('discover.grid.tanStack.filterForValueButtonLabel', {
                        defaultMessage: 'Filter for',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty iconType="minusCircle" size="s" onClick={handleFilterOut}>
                      {i18n.translate('discover.grid.tanStack.filterOutValueButtonLabel', {
                        defaultMessage: 'Filter out',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="copy" size="s" onClick={handleCopy}>
                  {i18n.translate('discover.grid.tanStack.copyValueButtonLabel', {
                    defaultMessage: 'Copy value',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverFooter>
        </EuiPanel>
      </EuiPortal>
    );
  }
);

/**
 * Owns cell-popover state so opening/closing it does not re-render the grid.
 * Parent keeps a stable setPopoverState callback that forwards into this host via ref.
 */
export const CellPopoverHost = React.memo(function CellPopoverHost({
  setPopoverStateRef,
  scrollParentRef,
  onFilterRef,
  styles,
}: {
  setPopoverStateRef: React.MutableRefObject<SetCellPopoverState>;
  scrollParentRef: React.RefObject<HTMLDivElement | null>;
  onFilterRef: React.MutableRefObject<UnifiedDataTableProps['onFilter'] | undefined>;
  styles: ReturnType<typeof getTanStackDataGridStyles>;
}) {
  const [popoverState, setPopoverState] = useState<CellPopoverState | null>(null);
  const closePopover = useCallback(() => setPopoverState(null), []);

  setPopoverStateRef.current = setPopoverState;

  useEffect(() => {
    if (!popoverState) return;
    const scrollEl = scrollParentRef.current;
    if (!scrollEl) return;
    const onScroll = () => setPopoverState(null);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [popoverState, scrollParentRef]);

  if (!popoverState) {
    return null;
  }

  return (
    <CellPopover
      fieldName={popoverState.fieldName}
      value={popoverState.value}
      formattedValue={popoverState.formattedValue}
      cellElement={popoverState.cellElement}
      cellWidth={popoverState.cellWidth}
      onClose={closePopover}
      onFilter={onFilterRef.current}
      styles={styles}
    />
  );
});
