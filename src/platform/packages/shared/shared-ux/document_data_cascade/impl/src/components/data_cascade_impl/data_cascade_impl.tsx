/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  Children,
  isValidElement,
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from 'react';
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
import { type GroupNode, type LeafNode, useDataCascadeState } from '../../store_provider';
import { getCascadeRowCellId, isCascadeGroupRowNode } from '../../lib/utils';
import {
  TableHeader,
  useCascadeTable,
  type CascadeTable,
  type CascadeTableCellContext,
} from '../../lib/core/table';
import {
  useCascadeVirtualizer,
  VirtualizedCascadeRowList,
  calculateActiveStickyIndex,
  useControllerValue,
  type VirtualizedCascadeListProps,
  type CascadeVirtualizerReturnValue,
  type VirtualizerInstanceType,
} from '../../lib/core/virtualizer';
import { useExposePublicApi } from '../../lib/core/api';
import {
  useRegisterCascadeAccessibilityHelpers,
  useTreeGridContainerARIAAttributes,
} from '../../lib/core/accessibility';
import {
  dataCascadeImplStyles,
  relativePosition,
  stickyHeaderVisibleAttribute,
} from './data_cascade_impl.styles';
import type { DataCascadeImplProps, DataCascadeRowProps, DataCascadeRowCellProps } from './types';

/**
 * @description Public Component for configuring the rendering of a data cascade row cell
 */
export const DataCascadeRowCell = <G extends GroupNode, L extends LeafNode>(
  _props: DataCascadeRowCellProps<G, L>
) => {
  return null;
};

/**
 * @description Public Component for configuring the rendering of a data cascade row
 */
export const DataCascadeRow = <G extends GroupNode, L extends LeafNode>(
  _props: DataCascadeRowProps<G, L>
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
  const { currentGroupByColumns } = useDataCascadeState<G, L>();
  const headerId = useGeneratedHtmlId({ prefix: 'dataCascade' });
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);
  const activeStickyRenderSlotRef = useRef<HTMLDivElement | null>(null);
  const virtualizerInstance = useRef<CascadeVirtualizerReturnValue>();

  const isMobile = useIsWithinMaxBreakpoint('m');
  const getScrollElement = useCallback(() => scrollElementRef.current, []);

  // Stable callback reference to retrieve the current value of the virtualizer elsewhere. It is only called
  // by rows and cells, which render after the virtualizer has been assigned below.
  const getVirtualizer = useCallback(() => virtualizerInstance.current!, []);

  const styles = useMemo(() => dataCascadeImplStyles(euiTheme), [euiTheme]);

  const cascadeHeaderElement = useCallback(
    ({ table }: { table: CascadeTable<G> }) => {
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
    (props: CascadeTableCellContext<G, unknown>) => {
      return (
        <CascadeRowCellPrimitive
          {...{
            ...props,
            ...rowElement.props.children.props,
            key: props.row.id,
            size,
            getVirtualizer,
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

  const collectVirtualizerStateRef = useRef<(instance: VirtualizerInstanceType) => void>();
  const onVirtualizerChange = useCallback((instance: VirtualizerInstanceType) => {
    collectVirtualizerStateRef.current?.(instance);
  }, []);

  const connectedChildrenPersistedAnchors = useMemo(() => {
    if (!initialState?.connectedChildren) return undefined;

    return Object.entries(initialState.connectedChildren).reduce((acc, [cellId, child]) => {
      if (child.isConnected) {
        acc[cellId] = child.scrollAnchorItemIndex;
      }
      return acc;
    }, {} as Record<string, number | null>);
  }, [initialState?.connectedChildren]);

  const [restorationTarget] = useState(() => {
    const row =
      initialState?.scrollAnchorItemIndex != null
        ? rows[initialState.scrollAnchorItemIndex]
        : undefined;

    if (!row || isCascadeGroupRowNode(currentGroupByColumns, row)) {
      return;
    }

    return { rowId: row.id, cellId: getCascadeRowCellId(currentGroupByColumns, row) };
  });

  const virtualizer = useCascadeVirtualizer<G>({
    rows,
    overscan,
    getScrollElement,
    enableStickyGroupHeader,
    estimatedRowHeight: size === 's' ? 32 : size === 'm' ? 40 : 48,
    onStateChange: onVirtualizerChange,
    initialRect: initialState?.scrollRect,
    initialAnchorItemIndex: initialState?.scrollAnchorItemIndex ?? undefined,
    initialPersistedAnchors: connectedChildrenPersistedAnchors,
    initialRestorationCellId: restorationTarget?.cellId,
  });

  virtualizerInstance.current = virtualizer;

  const { childController: controller, isStable: isVirtualizerStable } = virtualizer;

  ({ collectVirtualizerStateChanges: collectVirtualizerStateRef.current } = useExposePublicApi<
    G,
    L
  >(cascadeRef, {
    rows,
    enableStickyGroupHeader,
    childController: controller,
    isRestoring: !isVirtualizerStable,
  }));

  useEffect(() => {
    // If the restoration target is no longer a valid row,
    // this is an edge case that can happen when documents are being displayed using some relative time period.
    if (
      restorationTarget &&
      !rows.some((row) => row.id === restorationTarget.rowId && row.getIsExpanded())
    ) {
      controller.clearPersistedAnchor(restorationTarget.cellId);
    }
  }, [rows, controller, restorationTarget]);

  const hasDetachedChildren = useControllerValue(controller, (c) => c.hasDetachedChild(), false);

  // Calculate activeStickyIndex directly from the virtualizer's current range.
  // This ensures the value is always current and never stale from intermediate memoization.
  const activeStickyIndex = calculateActiveStickyIndex(
    rows,
    virtualizer.range?.startIndex ?? 0,
    enableStickyGroupHeader
  );

  useRegisterCascadeAccessibilityHelpers<G>({
    tableRows: rows,
    tableWrapperElement: cascadeWrapperRef.current!,
    scrollToRowIndex: virtualizer.scrollToVirtualizedIndex,
  });

  const virtualCascadeRowRenderer = useCallback<VirtualizedCascadeListProps<G>['listItemRenderer']>(
    ({ row, isActiveSticky, virtualItem, virtualRowStyle }) => {
      return (
        <CascadeRowPrimitive<G, L>
          {...{
            size,
            isActiveSticky,
            enableStickyGroupHeader,
            enableRowSelection,
            rowInstance: row,
            virtualRow: virtualItem,
            virtualRowStyle,
            isMobile,
            innerRef: getVirtualizer().measureElement,
            activeStickyRenderSlotRef,
            getVirtualizer,
            ...rowElement.props,
          }}
        />
      );
    },
    [size, enableRowSelection, isMobile, getVirtualizer, rowElement.props, enableStickyGroupHeader]
  );

  const treeGridContainerARIAAttributes = useTreeGridContainerARIAAttributes(headerId);

  const activeStickyRow = activeStickyIndex !== null ? rows[activeStickyIndex] : undefined;
  const activeStickyMeasurement =
    activeStickyIndex !== null ? virtualizer.measurementsCache[activeStickyIndex] : undefined;

  const shouldRenderStickyHeader = Boolean(
    activeStickyRow &&
      isCascadeGroupRowNode(currentGroupByColumns, activeStickyRow) &&
      activeStickyMeasurement &&
      (virtualizer.scrollOffset ?? 0) > activeStickyMeasurement.start
  );

  // Rendered by the auto sizer on every render of the cascade, so that it reads the virtualizer's current items
  const cascadeTreeGridRenderer = (containerSize: EuiAutoSize) => {
    const isLoading =
      containerSize.height === 0 || containerSize.width === 0 || !isVirtualizerStable;

    return (
      <React.Fragment>
        <div
          css={css([
            styles.cascadeLoadingContainer,
            {
              visibility: isLoading ? 'visible' : 'hidden',
            },
          ])}
        >
          <EuiLoadingSpinner size="l" />
        </div>
        <div
          ref={scrollElementRef}
          css={css([
            styles.cascadeTreeGridBlock,
            hasDetachedChildren && { contain: 'none' },
            {
              visibility: isLoading ? 'hidden' : 'visible',
            },
          ])}
          style={containerSize}
          data-test-subj="dataCascadeScrollContainer"
        >
          {/* Always render the slot so the ref is available immediately; the sticky header content
            transitions in and out based on the visibility attribute. */}
          <div
            css={styles.cascadeTreeGridHeaderStickyRenderSlot}
            {...{ [stickyHeaderVisibleAttribute]: shouldRenderStickyHeader }}
          >
            <div ref={activeStickyRenderSlotRef} />
          </div>
          <div css={styles.cascadeTreeGridWrapper} style={{ height: virtualizer.getTotalSize() }}>
            <div {...treeGridContainerARIAAttributes} css={relativePosition}>
              <CascadeRowHeaderSlotsScrollSyncProvider disableScrollSync={virtualizer.isScrolling}>
                <VirtualizedCascadeRowList<G>
                  {...{
                    activeStickyIndex,
                    getVirtualItems: virtualizer.getVirtualItems,
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
  };

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
