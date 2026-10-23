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
  stickyHeaderExtensionPointTestSubjAttribute,
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
  enableStickyGroupHeader = true,
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

  // A stable host lets cells keep their toolbar and column headers mounted throughout scrolling.
  const [stickyHeaderExtensionElement] = useState(() => {
    const element = document.createElement('div');
    element.setAttribute('data-test-subj', stickyHeaderExtensionPointTestSubjAttribute);
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

  // Layout offsets let native sticky positioning account for a leaf's place in the virtual list.
  const leafRowPositionStyle = useMemo(
    () => ({ top: virtualRow.start, zIndex: rowDepth + 1 }),
    [virtualRow.start, rowDepth]
  );
  const rowPositionStyle = isGroupNode ? virtualRowStyle : leafRowPositionStyle;

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
      style={rowPositionStyle}
      {...(isActiveSticky ? { 'data-active-sticky': true } : {})}
      css={styles.rowWrapper}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize={!isGroupNode && rowIsExpanded ? 'none' : size}
        css={styles.rowInner}
      >
        <React.Fragment>
          {enableStickyGroupHeader &&
          isActiveSticky &&
          isGroupNode &&
          activeStickyRenderSlotRef.current
            ? createPortal(
                <div css={styles.rowStickyHeaderInner}>{rowHeader}</div>,
                activeStickyRenderSlotRef.current,
                `${rowId}-sticky-header`
              )
            : null}
        </React.Fragment>
        <EuiFlexItem
          css={[
            !isGroupNode && styles.rowHeader,
            enableStickyGroupHeader && !isGroupNode && rowIsExpanded && styles.inlineStickyHeader,
          ]}
          data-test-subj={!isGroupNode ? 'dataCascadeInlineStickyHeader' : undefined}
        >
          {rowHeader}
          {!isGroupNode && (
            <div ref={attachStickyHeaderExtensionElement} css={styles.rowInlineHeaderExtension} />
          )}
        </EuiFlexItem>
        <StickyHeaderExtensionPointProvider
          extensionPointElement={stickyHeaderExtensionElement}
          stickyEnabled={enableStickyGroupHeader}
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
