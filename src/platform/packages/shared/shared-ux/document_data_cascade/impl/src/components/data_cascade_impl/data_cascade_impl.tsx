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
  EuiLoadingSpinner,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinMaxBreakpoint,
  type EuiAutoSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CascadeHeaderPrimitive } from './data_cascade_header';
import { CascadeRowPrimitive, CascadeRowHeaderSlotsScrollSyncProvider } from './data_cascade_row';
import { CascadeRowCellPrimitive } from './data_cascade_row_cell';
import { type GroupNode, type LeafNode } from '../../store_provider';
import { TableHeader, useCascadeTable, type Table, type CellContext } from '../../lib/core/table';
import {
  useCascadeVirtualizer,
  VirtualizedCascadeRowList,
  calculateActiveStickyIndex,
  type VirtualizedCascadeListProps,
} from '../../lib/core/virtualizer';
import { useExposePublicApi } from '../../lib/core/api';
import {
  useRegisterCascadeAccessibilityHelpers,
  useTreeGridContainerARIAAttributes,
} from '../../lib/core/accessibility';
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
  onCascadeGroupingChange,
  size = 'm',
  tableTitleSlot: TableTitleSlot,
  customTableHeader,
  overscan = 10,
  children,
  enableRowSelection = false,
  enableStickyGroupHeader = true,
  allowMultipleRowToggle = false,
  initialState,
  cascadeRef,
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

  const isMobile = useIsWithinMaxBreakpoint('m');
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
    enableRowSelection,
    allowMultipleRowToggle,
    header: cascadeHeaderElement,
    rowCell: cascadeRowCell,
  });

  const { collectVirtualizerStateChanges } = useExposePublicApi<G, L>(cascadeRef, {
    rows,
    enableStickyGroupHeader,
    childController: virtualizerInstance.current?.childController,
  });

  const initialPersistedAnchors = useMemo(() => {
    if (!initialState?.connectedChildren) return undefined;
    const anchors: Record<string, number | null> = {};
    for (const [cellId, child] of Object.entries(initialState.connectedChildren)) {
      anchors[cellId] = child.scrollAnchorItemIndex;
    }
    return anchors;
  }, [initialState?.connectedChildren]);

  virtualizerInstance.current = useCascadeVirtualizer<G>({
    rows,
    overscan,
    getScrollElement,
    enableStickyGroupHeader,
    estimatedRowHeight: size === 's' ? 32 : size === 'm' ? 40 : 48,
    onStateChange: collectVirtualizerStateChanges,
    initialRect: initialState?.scrollRect,
    initialAnchorItemIndex: initialState?.scrollAnchorItemIndex ?? undefined,
    initialPersistedAnchors,
  });

  // Calculate activeStickyIndex directly from the virtualizer's current range.
  // This ensures the value is always current and never stale from intermediate memoization.
  const activeStickyIndex = calculateActiveStickyIndex(
    rows,
    virtualizerInstance.current?.range?.startIndex ?? 0,
    enableStickyGroupHeader
  );

  useRegisterCascadeAccessibilityHelpers<G>({
    tableRows: rows,
    tableWrapperElement: cascadeWrapperRef.current!,
    scrollToRowIndex: virtualizerInstance.current!.scrollToVirtualizedIndex,
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
          isMobile,
          innerRef: virtualizerInstance.current!.measureElement,
          activeStickyRenderSlotRef,
          // getVirtualizer will not return undefined here as it is set immediately after the first render
          getVirtualizer: getVirtualizer as () => ReturnType<typeof useCascadeVirtualizer>,
          ...rowElement.props,
        }}
      />
    ),
    [size, enableRowSelection, isMobile, getVirtualizer, rowElement.props]
  );

  const treeGridContainerARIAAttributes = useTreeGridContainerARIAAttributes(headerId);

  const shouldRenderStickyHeader = useMemo(() => {
    return (
      enableStickyGroupHeader &&
      activeStickyIndex !== null &&
      (virtualizerInstance.current?.scrollOffset ?? 0) >
        (virtualizerInstance.current?.virtualizedRowComputedTranslateValue.get(0) ?? 0)
    );
  }, [activeStickyIndex, enableStickyGroupHeader]);

  const cascadeTreeGridRenderer = useCallback(
    (containerSize: EuiAutoSize) => {
      return (
        <React.Fragment>
          <div
            css={css([
              styles.cascadeLoadingContainer,
              {
                visibility:
                  containerSize.height === 0 || containerSize.width === 0 ? 'visible' : 'hidden',
              },
            ])}
          >
            <EuiLoadingSpinner size="l" />
          </div>
          <div
            ref={scrollElementRef}
            css={css([
              styles.cascadeTreeGridBlock,
              {
                visibility:
                  containerSize.height === 0 || containerSize.width === 0 ? 'hidden' : 'visible',
              },
            ])}
            style={containerSize}
            data-test-subj="data-cascade-scroll-container"
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
            <div
              css={styles.cascadeTreeGridWrapper}
              style={{ height: virtualizerInstance.current?.getTotalSize() }}
            >
              <div {...treeGridContainerARIAAttributes} css={relativePosition}>
                <CascadeRowHeaderSlotsScrollSyncProvider
                  disableScrollSync={virtualizerInstance.current?.isScrolling}
                >
                  <VirtualizedCascadeRowList<G>
                    {...{
                      activeStickyIndex,
                      getVirtualItems: virtualizerInstance.current!.getVirtualItems,
                      virtualizedRowComputedTranslateValue:
                        virtualizerInstance.current!.virtualizedRowComputedTranslateValue,
                      rows,
                      listItemRenderer: virtualCascadeRowRenderer,
                    }}
                  />
                </CascadeRowHeaderSlotsScrollSyncProvider>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    },
    [
      styles,
      shouldRenderStickyHeader,
      activeStickyRenderSlotRef,
      treeGridContainerARIAAttributes,
      rows,
      virtualCascadeRowRenderer,
      activeStickyIndex,
    ]
  );

  return (
    <div ref={cascadeWrapperRef} data-test-subj="data-cascade" css={styles.container}>
      <EuiFlexGroup direction="column" gutterSize="none" css={styles.containerInner}>
        <EuiFlexItem grow={false}>
          <TableHeader headerColumns={headerColumns} />
        </EuiFlexItem>
        <EuiFlexItem grow={true} style={{ position: 'relative' }}>
          <EuiAutoSizer
            defaultHeight={initialState?.scrollRect?.height}
            defaultWidth={initialState?.scrollRect?.width}
            doNotBailOutOnEmptyChildren
          >
            {cascadeTreeGridRenderer}
          </EuiAutoSizer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
