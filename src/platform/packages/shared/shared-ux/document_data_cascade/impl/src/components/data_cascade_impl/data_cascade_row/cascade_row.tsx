/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { CascadeRowPrimitiveProps } from '../types';
import { type LeafNode, type GroupNode, useDataCascadeState } from '../../../store_provider';
import { TableCellRender, useAdaptedTableRows } from '../../../lib/core/table';
import { useTreeGridRowARIAAttributes } from '../../../lib/core/accessibility';
import { StickyHeaderExtensionPointProvider } from '../../helpers/sticky_header_extension_point';
import { isCascadeGroupRowNode } from '../../../lib/utils';
import {
  styles as cascadeRowStyles,
  rootRowAttribute,
  childRowAttribute,
} from './cascade_row.styles';
import { CascadeRowHeaderPrimitive } from './components/cascade_row_header';

export { CascadeRowHeaderPrimitive };

/**
 * @internal
 * @description Internal component that is used to render a row in the data cascade component.
 */
export function CascadeRowPrimitive<G extends GroupNode, L extends LeafNode>({
  activeStickyRenderSlotRef,
  isActiveSticky,
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

  // Ref for the cell portal target - always available since we always render the portal
  const stickyHeaderExtensionRenderRef = useRef<HTMLDivElement | null>(null);

  const setStickyHeaderExtensionRenderRef = useCallback((ref: HTMLDivElement | null) => {
    stickyHeaderExtensionRenderRef.current = ref;
  }, []);

  const isGroupNode = isCascadeGroupRowNode(currentGroupByColumns, rowInstance);

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
    isGroupNode,
    RowTitleSlot,
    rowHeaderMetaSlots,
    rowHeaderActions,
    rowInstance,
    size,
    enableRowSelection,
    enableSecondaryExpansionAction,
    onCascadeGroupNodeExpanded,
    onCascadeGroupNodeCollapsed,
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
        {/* Always render the portal when the slot is available so the cell portal
            target ref is always set. Toggle visibility with CSS based on isActiveSticky. */}
        {activeStickyRenderSlotRef.current &&
          createPortal(
            <div
              css={[
                styles.rowStickyHeaderInner,
                isActiveSticky ? null : styles.rowStickyHeaderInnerHidden,
              ]}
            >
              <>{rowHeader}</>
              <div
                data-test-subj="sticky-header-extension-point"
                ref={setStickyHeaderExtensionRenderRef}
                css={styles.rowStickyHeaderExtensionPointWrapper}
              />
            </div>,
            activeStickyRenderSlotRef.current,
            `${rowId}-sticky-header`
          )}
        <EuiFlexItem>{rowHeader}</EuiFlexItem>
        <React.Fragment>
          <StickyHeaderExtensionPointProvider
            extensionPointRef={stickyHeaderExtensionRenderRef}
            isActiveSticky={isActiveSticky}
          >
            {!isGroupNode && rowIsExpanded && hasAllParentsExpanded && (
              <EuiFlexItem role="gridcell">
                {rowVisibleCells.map((cell) => (
                  <TableCellRender key={cell.id} cell={cell} />
                ))}
              </EuiFlexItem>
            )}
          </StickyHeaderExtensionPointProvider>
        </React.Fragment>
      </EuiFlexGroup>
    </div>
  );
}
