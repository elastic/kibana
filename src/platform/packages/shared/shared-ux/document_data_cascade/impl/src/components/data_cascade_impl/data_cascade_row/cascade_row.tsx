/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, useCombinedRefs } from '@elastic/eui';
import type { CascadeRowPrimitiveProps } from '../types';
import { type LeafNode, type GroupNode, useDataCascadeState } from '../../../store_provider';
import { TableCellRender, useAdaptedTableRows } from '../../../lib/core/table';
import { useTreeGridRowARIAAttributes } from '../../../lib/core/accessibility';
import { useControllerValue } from '../../../lib/core/virtualizer';
import { isCascadeGroupRowNode, getCascadeRowCellId } from '../../../lib/utils';
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

  const [stickyHeaderExtensionElement, setStickyHeaderExtensionElement] =
    useState<HTMLDivElement | null>(null);

  // Held in state rather than in a ref: a row's ref is attached after the layout effects of its descendants
  // have run, so a leaf that measures itself against the row needs to be told when the element is there.
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
  const headerElementRef = useRef<HTMLDivElement>(null);

  // Memoized so the ref callback keeps its identity, otherwise React detaches and re-attaches it on every render.
  const rowRefs = useMemo(
    () => (isGroupNode ? [innerRef] : [setRowElement, innerRef]),
    [isGroupNode, innerRef]
  );

  const measureRowRef = useCombinedRefs(rowRefs);

  const cellId = useMemo(
    () => (isGroupNode ? null : getCascadeRowCellId(currentGroupByColumns, rowInstance)),
    [currentGroupByColumns, rowInstance, isGroupNode]
  );

  const controller = getVirtualizer().childController;
  const isDetached = useControllerValue(
    controller,
    (c) => cellId !== null && c.isDetached(cellId),
    false
  );

  useEffect(() => {
    if (!rowIsExpanded && cellId) {
      controller.clearPersistedAnchor(cellId);
    }
  }, [rowIsExpanded, cellId, controller]);

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
      ref={measureRowRef}
      style={isDetached ? { ...rowPositionStyle, zIndex: euiTheme.levels.modal } : rowPositionStyle}
      {...(isActiveSticky ? { 'data-active-sticky': true } : {})}
      css={[styles.rowWrapper, isDetached && { contain: 'none' }]}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize={!isGroupNode && rowIsExpanded ? 'none' : size}
        css={styles.rowInner}
        responsive={false}
      >
        {/*
         * For GroupNodes, when the conditions are right the row header is rendered into the active sticky render slot leveraging portals.
         */}
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
        <EuiFlexItem
          ref={headerElementRef}
          css={
            !isGroupNode
              ? [
                  styles.rowHeader,
                  enableStickyGroupHeader && rowIsExpanded && styles.inlineStickyHeader,
                ]
              : []
          }
          data-test-subj={!isGroupNode ? 'dataCascadeInlineStickyHeader' : undefined}
        >
          {rowHeader}
          {!isGroupNode && (
            <div css={styles.rowInlineHeaderExtension}>
              <div
                ref={setStickyHeaderExtensionElement}
                data-test-subj={stickyHeaderExtensionPointTestSubjAttribute}
              />
            </div>
          )}
        </EuiFlexItem>
        <StickyHeaderExtensionPointProvider
          extensionPointElement={stickyHeaderExtensionElement}
          stickyEnabled={enableStickyGroupHeader}
          rowIndex={virtualRow.index}
          rowElement={rowElement}
          headerElementRef={headerElementRef}
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
