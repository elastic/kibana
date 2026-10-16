/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { CascadeRowPrimitiveProps } from '../types';
import { type LeafNode, type GroupNode, useDataCascadeState } from '../../../store_provider';
import { TableCellRender, useAdaptedTableRows } from '../../../lib/core/table';
import { useTreeGridRowARIAAttributes } from '../../../lib/core/accessibility';
import {
  isCascadeGroupRowNode,
  getCascadeRowNodePath,
  getCascadeRowNodePathValueRecord,
  getCascadeRowLeafDataCacheKey,
} from '../../../lib/utils';
import {
  styles as cascadeRowStyles,
  rootRowAttribute,
  childRowAttribute,
} from './cascade_row.styles';
import { CascadeRowHeaderPrimitive } from './components/cascade_row_header';
import { StickyHeaderExtensionPointProvider } from './components/cascade_row_header_extension_point';

export { CascadeRowHeaderPrimitive };

/**
 * @internal
 * @description Internal component that is used to render a row in the data cascade component.
 */
function CascadeRowPrimitiveComponent<G extends GroupNode, L extends LeafNode>({
  isMobile,
  activeStickyRenderSlotRef,
  isActiveSticky,
  isStickyHeaderVisible,
  innerRef,
  onCascadeGroupNodeExpanded,
  onCascadeGroupNodeCollapsed,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowHeaderActions,
  rowInstance,
  size,
  virtualRow,
  virtualRowStyle,
  enableRowSelection,
  getVirtualizer,
  enableSecondaryExpansionAction,
}: CascadeRowPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const { currentGroupByColumns } = useDataCascadeState<G, L>();
  const { rowId, rowIsExpanded, hasAllParentsExpanded, rowDepth, rowParentId, rowVisibleCells } =
    useAdaptedTableRows<G, L>({ rowInstance });
  const treeGridRowARIAAttributes = useTreeGridRowARIAAttributes<G>({
    rowInstance,
    virtualRowIndex: virtualRow.index,
  });

  const isGroupNode = isCascadeGroupRowNode(currentGroupByColumns, rowInstance);

  // The extension point element is created once and re-attached to the sticky header whenever it is
  // displayed. Keeping it stable lets descendant cells portal into it on the very render that the
  // sticky header appears, instead of one commit later once a ref would have been populated.
  const [stickyHeaderExtensionElement] = useState(() => {
    const element = document.createElement('div');
    element.setAttribute('data-test-subj', 'sticky-header-extension-point');
    return element;
  });

  const attachStickyHeaderExtensionElement = useCallback(
    (host: HTMLDivElement | null) => {
      if (host && stickyHeaderExtensionElement.parentElement !== host) {
        host.appendChild(stickyHeaderExtensionElement);
      }
    },
    [stickyHeaderExtensionElement]
  );

  const cellId = useMemo(() => {
    if (isGroupNode) return null;
    const nodePath = getCascadeRowNodePath(currentGroupByColumns, rowInstance);
    const nodePathMap = getCascadeRowNodePathValueRecord(currentGroupByColumns, rowInstance);
    return getCascadeRowLeafDataCacheKey(nodePath, nodePathMap, rowInstance.id);
  }, [currentGroupByColumns, rowInstance, isGroupNode]);

  useEffect(() => {
    if (!rowIsExpanded && cellId) {
      getVirtualizer().childController?.clearPersistedAnchor(cellId);
    }
  }, [rowIsExpanded, cellId, getVirtualizer]);

  const styles = useMemo(() => {
    return cascadeRowStyles(
      euiTheme,
      Boolean(rowParentId && hasAllParentsExpanded),
      rowDepth,
      size
    );
  }, [euiTheme, hasAllParentsExpanded, rowDepth, rowParentId, size]);

  const rowHeader = useMemo(() => {
    return (
      <CascadeRowHeaderPrimitive<G, L>
        isMobile={isMobile}
        isGroupNode={isGroupNode}
        rowHeaderTitleSlot={RowTitleSlot}
        rowHeaderMetaSlots={rowHeaderMetaSlots}
        rowHeaderActions={rowHeaderActions}
        rowInstance={rowInstance}
        size={size}
        enableRowSelection={enableRowSelection}
        enableSecondaryExpansionAction={enableSecondaryExpansionAction}
        onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
        onCascadeGroupNodeCollapsed={onCascadeGroupNodeCollapsed}
      />
    );
  }, [
    RowTitleSlot,
    enableRowSelection,
    enableSecondaryExpansionAction,
    isGroupNode,
    onCascadeGroupNodeExpanded,
    onCascadeGroupNodeCollapsed,
    rowHeaderActions,
    rowHeaderMetaSlots,
    rowInstance,
    size,
    isMobile,
  ]);

  return (
    <div
      {...treeGridRowARIAAttributes}
      data-index={virtualRow.index}
      data-row-type={rowDepth === 0 ? rootRowAttribute : childRowAttribute}
      ref={innerRef}
      style={virtualRowStyle}
      {...(isActiveSticky ? { 'data-active-sticky': true } : {})}
      css={styles.rowWrapper}
    >
      <EuiFlexGroup direction="column" gutterSize={size} css={styles.rowInner}>
        <React.Fragment>
          {/**
           * `isActiveSticky` is true when the user's scroll position exceeds the row header's Y position, when this happens
           * we portal the entire sticky header into a designated area within the grid container that stays sticky on scroll,
           * given the actual rendered header might be so far way, keeping it sticky would require a transform to bring it into view,
           * which would be visually jarring since we would have to adjust on every scroll event.
           */}
          {isActiveSticky && activeStickyRenderSlotRef.current
            ? createPortal(
                <EuiFlexGroup
                  css={styles.rowStickyHeaderInner}
                  direction="column"
                  gutterSize="none"
                >
                  <EuiFlexItem>{rowHeader}</EuiFlexItem>
                  <EuiFlexItem
                    ref={attachStickyHeaderExtensionElement}
                    css={styles.rowStickyHeaderExtensionPointWrapper}
                  />
                </EuiFlexGroup>,
                activeStickyRenderSlotRef.current,
                `${rowId}-sticky-header`
              )
            : null}
        </React.Fragment>
        <EuiFlexItem>{rowHeader}</EuiFlexItem>
        {/**
         * Descendants are only told the sticky header is active once the slot is actually displayed,
         * so content they move into it never disappears into a hidden slot ahead of the reveal.
         */}
        <StickyHeaderExtensionPointProvider
          extensionPointElement={stickyHeaderExtensionElement}
          isDisplayed={isActiveSticky && isStickyHeaderVisible}
        >
          {!isGroupNode && rowIsExpanded && hasAllParentsExpanded && (
            <EuiFlexItem role="gridcell">
              {rowVisibleCells.map((cell) => (
                <TableCellRender key={cell.id} cell={cell} />
              ))}
            </EuiFlexItem>
          )}
        </StickyHeaderExtensionPointProvider>
      </EuiFlexGroup>
    </div>
  );
}

/**
 * @internal
 * @description Memoized so that the per-scroll re-render of the virtualized list only reconciles rows whose
 * props actually changed. Table state changes (expansion, selection) still re-render every row through the
 * cascade store context, which bypasses the memo.
 */
export const CascadeRowPrimitive = React.memo(
  CascadeRowPrimitiveComponent
) as typeof CascadeRowPrimitiveComponent;
