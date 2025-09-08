/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Children, isValidElement, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { EuiAutoSizer, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { SelectionDropdown } from './group_selection_combobox/selection_dropdown';
import { CascadeRowPrimitive } from './data_cascade_row';
import { CascadeRowCellPrimitive } from './data_cascade_row_cell';
import { useDataCascadeActions, type GroupNode, type LeafNode } from '../../store_provider';
import { TableHeader, useTableHelper, type Table, type CellContext } from '../../lib/core/table';
import {
  useRowVirtualizerHelper,
  getGridHeaderPositioningStyle,
  getGridRowPositioningStyle,
} from '../../lib/core/virtualizer';
import {
  useRegisterCascadeAccessibilityHelpers,
  useTreeGridContainerARIAAttributes,
} from '../../lib/core/accessibility';
import { dataCascadeImplStyles, relativePosition, overflowYAuto } from './data_cascade_impl.styles';
import type {
  DataCascadeImplProps,
  DataCascadeRowProps,
  DataCascadeRowCellProps,
  CascadeRowPrimitiveProps,
} from './types';

/**
 * @description Public Component for rendering a data cascade row cell
 */
export const DataCascadeRowCell = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(
  props: DataCascadeRowCellProps<G, L>
) => {
  return null;
};

/**
 * @description Public Component for rendering a data cascade row
 */
export const DataCascadeRow = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(
  props: DataCascadeRowProps<G, L>
) => {
  return null;
};

export function DataCascadeImpl<G extends GroupNode, L extends LeafNode>({
  data,
  onCascadeGroupingChange,
  size = 'm',
  tableTitleSlot: TableTitleSlot,
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
  const actions = useDataCascadeActions<G, L>();

  // The scrollable element for your list
  const scrollElementRef = useRef(null);
  const cascadeWrapperRef = useRef<HTMLDivElement | null>(null);
  const activeStickyRenderSlotRef = useRef<HTMLDivElement | null>(null);

  const styles = useMemo(() => dataCascadeImplStyles(euiTheme), [euiTheme]);

  useEffect(() => {
    actions.setInitialState(data);
  }, [data, actions]);

  const cascadeHeaderElement = useCallback(
    ({ table }: { table: Table<G> }) => {
      const { rows: tableRows } = table.getGroupedRowModel();

      return (
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          css={styles.cascadeHeaderWrapper}
        >
          <EuiFlexItem id="treegrid-label">
            <TableTitleSlot rows={tableRows} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectionDropdown onSelectionChange={onCascadeGroupingChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [TableTitleSlot, onCascadeGroupingChange, styles.cascadeHeaderWrapper]
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
          }}
        />
      );
    },
    [rowElement.props.children.props, size]
  );

  const { headerColumns, rows } = useTableHelper<G, L>({
    enableRowSelection,
    allowMultipleRowToggle,
    header: cascadeHeaderElement,
    rowCell: cascadeRowCell,
  });

  const {
    activeStickyIndex,
    rowVirtualizer,
    virtualizedRowComputedTranslateValue,
    scrollToVirtualizedIndex,
  } = useRowVirtualizerHelper<G>({
    rows,
    overscan,
    getScrollElement: () => scrollElementRef.current,
    enableStickyGroupHeader,
  });

  useRegisterCascadeAccessibilityHelpers<G>({
    tableRows: rows,
    tableWrapperElement: cascadeWrapperRef.current!,
    scrollToRowIndex: scrollToVirtualizedIndex,
  });

  const treeGridContainerARIAAttributes = useTreeGridContainerARIAAttributes();

  return (
    <div ref={cascadeWrapperRef} data-test-subj="data-cascade" css={styles.container}>
      <EuiAutoSizer>
        {(containerSize) => (
          <div ref={scrollElementRef} css={overflowYAuto} style={{ ...containerSize }}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              css={relativePosition}
              style={{ width: containerSize.width }}
            >
              <EuiFlexItem
                css={styles.cascadeTreeGridHeader}
                style={getGridHeaderPositioningStyle(virtualizedRowComputedTranslateValue)}
                data-scrolled={Boolean(rowVirtualizer.scrollOffset ?? 0)}
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
                <div
                  css={styles.cascadeTreeGridWrapper}
                  style={{ height: rowVirtualizer.getTotalSize() }}
                >
                  <div
                    {...treeGridContainerARIAAttributes}
                    aria-labelledby="treegrid-label"
                    css={relativePosition}
                  >
                    {rowVirtualizer
                      .getVirtualItems()
                      .map(function buildCascadeRows(virtualItem, renderIndex) {
                        const row = rows[virtualItem.index];

                        // CONSIDERATION: maybe use the sticky index as a marker for accessibility announcements
                        const isActiveSticky =
                          enableStickyGroupHeader && activeStickyIndex === virtualItem.index;

                        virtualizedRowComputedTranslateValue.set(renderIndex, virtualItem.start);

                        const rowToRender = React.createElement<CascadeRowPrimitiveProps<G, L>>(
                          CascadeRowPrimitive,
                          {
                            size,
                            innerRef: rowVirtualizer.measureElement,
                            isActiveSticky,
                            enableRowSelection,
                            rowInstance: row,
                            virtualRow: virtualItem,
                            virtualRowStyle: getGridRowPositioningStyle(
                              renderIndex,
                              isActiveSticky,
                              virtualizedRowComputedTranslateValue
                            ),
                            ...rowElement.props,
                          }
                        );

                        return (
                          <React.Fragment key={row.id}>
                            {isActiveSticky && activeStickyRenderSlotRef.current
                              ? ReactDOM.createPortal(
                                  rowToRender,
                                  activeStickyRenderSlotRef.current,
                                  row.id
                                )
                              : rowToRender}
                          </React.Fragment>
                        );
                      })}
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
