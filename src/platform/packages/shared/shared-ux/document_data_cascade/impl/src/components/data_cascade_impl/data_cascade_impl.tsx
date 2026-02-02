/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Children, isValidElement, useRef, useMemo, useCallback } from 'react';
import {
  EuiAutoSizer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CascadeHeaderPrimitive } from './data_cascade_header';
import { CascadeRowPrimitive } from './data_cascade_row';
import { CascadeRowCellPrimitive } from './data_cascade_row_cell';
import { type GroupNode, type LeafNode } from '../../store_provider';
import { TableHeader, useCascadeTable, type Table, type CellContext } from '../../lib/core/table';
import {
  useCascadeVirtualizer,
  VirtualizedCascadeRowList,
  calculateActiveStickyIndex,
  type VirtualizedCascadeListProps,
} from '../../lib/core/virtualizer';
import {
  useRegisterCascadeAccessibilityHelpers,
  useTreeGridContainerARIAAttributes,
} from '../../lib/core/accessibility';
import { ScrollSyncProvider } from '../../lib/core/scroll_sync';
import { dataCascadeImplStyles, relativePosition } from './data_cascade_impl.styles';
import type { DataCascadeImplProps, DataCascadeRowProps, DataCascadeRowCellProps } from './types';

/**
 * @description Public Component for configuring the rendering of a data cascade row cell
 */
export const DataCascadeRowCell = <G extends GroupNode, L extends LeafNode>(
  props: DataCascadeRowCellProps<G, L>
) => {
  return null;
};

/**
 * @description Public Component for configuring the rendering of a data cascade row
 */
export const DataCascadeRow = <G extends GroupNode, L extends LeafNode>(
  props: DataCascadeRowProps<G, L>
) => {
  return null;
};

export function DataCascadeImpl<G extends GroupNode, L extends LeafNode>({
  data,
  onCascadeGroupingChange,
  size = 'm',
  tableTitleSlot: TableTitleSlot,
  customTableHeader,
  overscan = 10,
  children,
  enableRowSelection = false,
  enableStickyGroupHeader = true,
  allowMultipleRowToggle = false,
}: DataCascadeImplProps<G, L>) {
  const rowElement = Children.only(children);

  if (!isValidElement(rowElement) || rowElement.type !== DataCascadeRow) {
    throw new Error('DataCascade only accepts `DataCascadeRow` as child');
  }

  if (
    !isValidElement(rowElement.props.children) ||
    rowElement.props.children.type !== DataCascadeRowCell
  ) {
    throw new Error('DataCascadeRow only accepts `DataCascadeRowCell` as Child');
  }

  const { euiTheme } = useEuiTheme();
  const headerId = useGeneratedHtmlId({ prefix: 'dataCascade' });
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);
  const activeStickyRenderSlotRef = useRef<HTMLDivElement | null>(null);
  const virtualizerInstance = useRef<ReturnType<typeof useCascadeVirtualizer>>();

  const getScrollElement = useCallback(() => scrollElementRef.current, []);

  // create stable callback we can use to retrieve the current value of the virtualizer elsewhere
  const getVirtualizer = useCallback(() => virtualizerInstance.current, []);

  const styles = useMemo(() => dataCascadeImplStyles(euiTheme), [euiTheme]);

  const cascadeHeaderElement = useCallback(
    ({ table }: { table: Table<G> }) => {
      return (
        <CascadeHeaderPrimitive<G, L>
          id={headerId}
          tableInstance={table}
          customTableHeader={customTableHeader}
          tableTitleSlot={TableTitleSlot!}
          onCascadeGroupingChange={onCascadeGroupingChange}
        />
      );
    },
    [TableTitleSlot, customTableHeader, headerId, onCascadeGroupingChange]
  );

  const cascadeRowCell = useCallback(
    (props: CellContext<G, L>) => {
      return (
        <CascadeRowCellPrimitive
          {...{
            ...props,
            ...rowElement.props.children.props,
            key: props.row.id,
            size,
            // getVirtualizer will not return undefined here as it is set immediately after the first render
            getVirtualizer: getVirtualizer as () => ReturnType<typeof useCascadeVirtualizer>,
          }}
        />
      );
    },
    [getVirtualizer, rowElement.props.children.props, size]
  );

  const { headerColumns, rows } = useCascadeTable<G, L>({
    initialData: data,
    enableRowSelection,
    allowMultipleRowToggle,
    header: cascadeHeaderElement,
    rowCell: cascadeRowCell,
  });

  // persist the virtualizer instance to ref, so that invocations of getVirtualizer will always return the latest instance
  virtualizerInstance.current = useCascadeVirtualizer<G>({
    rows,
    overscan,
    getScrollElement,
    enableStickyGroupHeader,
    estimatedRowHeight: size === 's' ? 32 : size === 'm' ? 40 : 48,
  });

  const {
    getVirtualItems,
    getTotalSize,
    range,
    measureElement,
    virtualizedRowComputedTranslateValue,
    scrollToVirtualizedIndex,
    scrollOffset: virtualizerScrollOffset,
    isScrolling,
  } = virtualizerInstance.current;

  // Calculate activeStickyIndex directly from the virtualizer's current range.
  // This ensures the value is always current and never stale from intermediate memoization.
  const activeStickyIndex = calculateActiveStickyIndex(
    rows,
    range?.startIndex ?? 0,
    enableStickyGroupHeader
  );

  useRegisterCascadeAccessibilityHelpers<G>({
    tableRows: rows,
    tableWrapperElement: cascadeWrapperRef.current!,
    scrollToRowIndex: scrollToVirtualizedIndex,
  });

  const virtualCascadeRowRenderer = useCallback<VirtualizedCascadeListProps<G>['listItemRenderer']>(
    ({ row, isActiveSticky, virtualItem, virtualRowStyle }) => (
      <CascadeRowPrimitive<G, L>
        {...{
          size,
          isActiveSticky,
          enableRowSelection,
          rowInstance: row,
          virtualRow: virtualItem,
          virtualRowStyle,
          innerRef: measureElement,
          activeStickyRenderSlotRef,
          ...rowElement.props,
        }}
      />
    ),
    [size, enableRowSelection, rowElement.props, measureElement]
  );

  const treeGridContainerARIAAttributes = useTreeGridContainerARIAAttributes(headerId);

  const shouldRenderStickyHeader = useMemo(() => {
    return (
      enableStickyGroupHeader &&
      activeStickyIndex !== null &&
      (virtualizerScrollOffset ?? 0) > (virtualizedRowComputedTranslateValue.get(0) ?? 0)
    );
  }, [
    activeStickyIndex,
    enableStickyGroupHeader,
    virtualizerScrollOffset,
    virtualizedRowComputedTranslateValue,
  ]);

  return (
    <div ref={cascadeWrapperRef} data-test-subj="data-cascade" css={styles.container}>
      <EuiFlexGroup direction="column" gutterSize="none" css={styles.containerInner}>
        <EuiFlexItem grow={false}>
          <TableHeader headerColumns={headerColumns} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiAutoSizer doNotBailOutOnEmptyChildren>
            {(scrollContainerSize) => (
              <div
                ref={scrollElementRef}
                css={styles.cascadeTreeGridBlock}
                style={{
                  ...scrollContainerSize,
                }}
              >
                {/* Always render the slot so the ref is available immediately.
                    Use hidden style when not visible to avoid layout impact. */}
                <div
                  css={
                    shouldRenderStickyHeader
                      ? styles.cascadeTreeGridHeaderStickyRenderSlot
                      : styles.cascadeTreeGridHeaderStickyRenderSlotHidden
                  }
                >
                  <div ref={activeStickyRenderSlotRef} />
                </div>
                <div css={styles.cascadeTreeGridWrapper} style={{ height: getTotalSize() }}>
                  <div {...treeGridContainerARIAAttributes} css={relativePosition}>
                    <ScrollSyncProvider disableScrollSync={isScrolling}>
                      <VirtualizedCascadeRowList<G>
                        {...{
                          activeStickyIndex,
                          getVirtualItems,
                          virtualizedRowComputedTranslateValue,
                          rows,
                          listItemRenderer: virtualCascadeRowRenderer,
                        }}
                      />
                    </ScrollSyncProvider>
                  </div>
                </div>
              </div>
            )}
          </EuiAutoSizer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
