/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Children, isValidElement, useRef, useMemo, useCallback } from 'react';
import { EuiAutoSizer, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { CascadeHeaderPrimitive } from './data_cascade_header';
import { CascadeRowPrimitive } from './data_cascade_row';
import { CascadeRowCellPrimitive } from './data_cascade_row_cell';
import { type GroupNode, type LeafNode } from '../../store_provider';
import { TableHeader, useCascadeTable, type Table, type CellContext } from '../../lib/core/table';
import {
  useCascadeVirtualizer,
  getGridHeaderPositioningStyle,
  VirtualizedCascadeRowList,
  type VirtualizedCascadeListProps,
} from '../../lib/core/virtualizer';
import {
  useRegisterCascadeAccessibilityHelpers,
  useTreeGridContainerARIAAttributes,
} from '../../lib/core/accessibility';
import { dataCascadeImplStyles, relativePosition, overflowYAuto } from './data_cascade_impl.styles';
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

  const scrollElementRef = useRef(null);
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
          tableInstance={table}
          customTableHeader={customTableHeader}
          tableTitleSlot={TableTitleSlot!}
          onCascadeGroupingChange={onCascadeGroupingChange}
        />
      );
    },
    [TableTitleSlot, customTableHeader, onCascadeGroupingChange]
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
    activeStickyIndex,
    scrollOffset: virtualizerScrollOffset,
    measureElement,
    virtualizedRowComputedTranslateValue,
    scrollToVirtualizedIndex,
  } = virtualizerInstance.current;

  useRegisterCascadeAccessibilityHelpers<G>({
    tableRows: rows,
    tableWrapperElement: cascadeWrapperRef.current!,
    scrollToRowIndex: scrollToVirtualizedIndex,
  });

  const virtualCascadeRowRenderer = useCallback<VirtualizedCascadeListProps<G>['children']>(
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

  const treeGridContainerARIAAttributes = useTreeGridContainerARIAAttributes();

  return (
    <div ref={cascadeWrapperRef} data-test-subj="data-cascade" css={styles.container}>
      <EuiAutoSizer doNotBailOutOnEmptyChildren>
        {(containerSize) => (
          <div ref={scrollElementRef} css={overflowYAuto} style={{ ...containerSize }}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              css={relativePosition}
              style={{ width: containerSize.width }}
            >
              <EuiFlexItem
                grow={false}
                css={styles.cascadeTreeGridHeader}
                style={getGridHeaderPositioningStyle(virtualizedRowComputedTranslateValue)}
                data-scrolled={
                  // mark the header as scrolled if the first row has been scrolled out of view
                  (virtualizerScrollOffset ?? 0) > virtualizedRowComputedTranslateValue.get(0)!
                }
              >
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem>
                    <TableHeader headerColumns={headerColumns} />
                  </EuiFlexItem>
                  <React.Fragment>
                    {activeStickyIndex !== null && enableStickyGroupHeader && (
                      <EuiFlexItem
                        ref={activeStickyRenderSlotRef}
                        css={styles.cascadeTreeGridHeaderStickyRenderSlot}
                      />
                    )}
                  </React.Fragment>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <div css={styles.cascadeTreeGridWrapper} style={{ height: getTotalSize() }}>
                  <div
                    {...treeGridContainerARIAAttributes}
                    aria-labelledby="treegrid-label"
                    css={relativePosition}
                  >
                    <VirtualizedCascadeRowList<G>
                      {...{
                        activeStickyIndex,
                        getVirtualItems,
                        virtualizedRowComputedTranslateValue,
                        rows,
                      }}
                    >
                      {virtualCascadeRowRenderer}
                    </VirtualizedCascadeRowList>
                  </div>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </EuiAutoSizer>
    </div>
  );
}
