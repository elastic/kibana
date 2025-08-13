/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type ComponentProps,
  Children,
  isValidElement,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, EuiAutoSizer, useEuiTheme } from '@elastic/eui';
import { flexRender, type Row } from '@tanstack/react-table';
import { SelectionDropdown } from './group_selection_combobox/selection_dropdown';
import { CascadeRowPrimitive, type CascadeRowPrimitiveProps } from './data_cascade_row';
import {
  CascadeRowCellPrimitive,
  type CascadeRowCellPrimitiveProps,
} from './data_cascade_row_cell';
import {
  useDataCascadeState,
  useDataCascadeActions,
  type GroupNode,
  type LeafNode,
} from '../../store_provider';
import { useTableHelper } from '../../lib/core/table';
import {
  useRowVirtualizerHelper,
  getGridHeaderPositioningStyle,
  getGridRowPositioningStyle,
} from '../../lib/core/virtualizer';
import { dataCascadeImplStyles, relativePosition, overflowYAuto } from './data_cascade_impl.styles';

export type DataCascadeRowCellProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowCellPrimitiveProps<G, L>,
  'onCascadeLeafNodeExpanded' | 'children'
>;

export type DataCascadeRowProps<G extends GroupNode, L extends LeafNode> = Pick<
  CascadeRowPrimitiveProps<G, L>,
  'onCascadeGroupNodeExpanded' | 'rowHeaderMetaSlots' | 'rowHeaderTitleSlot'
> & {
  /**
   * Child element for the cascade row.
   */
  children: React.ReactElement<DataCascadeRowCellProps<G, L>>;
};

export interface DataCascadeImplProps<G extends GroupNode, L extends LeafNode>
  extends Pick<Parameters<typeof useRowVirtualizerHelper>[0], 'overscan'> {
  /**
   * The data to be displayed in the cascade. It should be an array of group nodes.
   */
  data: G[];
  /**
   * Callback function that is called when the group by selection changes.
   */
  onCascadeGroupingChange: ComponentProps<typeof SelectionDropdown>['onSelectionChange'];
  /**
   * The spacing size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  size?: CascadeRowPrimitiveProps<G, L>['size'];
  /**
   * Slot for the table title.
   */
  tableTitleSlot: React.FC<{ rows: Array<Row<G>> }>;
  /**
   * Whether to cause the group root to stick to the top of the viewport.
   */
  stickyGroupRoot?: boolean;
  /**
   * Whether to allow multiple group rows to be expanded at the same time, default is false.
   */
  allowExpandMultiple?: boolean;
  children: React.ReactElement<DataCascadeRowProps<G, L>>;
}

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
  stickyGroupRoot = false,
  overscan = 10,
  children,
  allowExpandMultiple = false,
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
  const state = useDataCascadeState<G, L>();
  const tableRef = useRef<ReturnType<typeof useTableHelper<G>>>();

  // The scrollable element for your list
  const scrollElementRef = useRef(null);
  const activeStickyRenderSlotRef = useRef<HTMLDivElement | null>(null);

  const styles = useMemo(() => dataCascadeImplStyles(euiTheme), [euiTheme]);

  useEffect(() => {
    actions.setInitialState(data);
  }, [data, actions]);

  tableRef.current = useTableHelper<G>({
    data: state.groupNodes,
    state: state.table,
    columns: (columnsHelper) => [
      columnsHelper.display({
        id: 'groupBy',
        header: (props) =>
          React.createElement(function GroupByHeader({ table: _table }) {
            const { rows } = _table.getGroupedRowModel();

            return (
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                css={styles.cascadeHeaderWrapper}
              >
                <EuiFlexItem>
                  <TableTitleSlot rows={rows} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SelectionDropdown onSelectionChange={onCascadeGroupingChange} />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }, props),
        cell: React.memo((props) => {
          return React.createElement<CascadeRowCellPrimitiveProps<G, L>>(CascadeRowCellPrimitive, {
            size,
            ...props,
            ...rowElement.props.children.props,
          });
        }),
      }),
    ],
    getRowId: (rowData) => rowData.id,
    getRowCanExpand: (row) => {
      if (allowExpandMultiple) {
        return true;
      }

      const expandedRowIds = Object.keys(state.table.expanded ?? {});

      return expandedRowIds.length === 0 || expandedRowIds.includes(row.id)
        ? true
        : // when not supporting expansions on multiple row, expansion is not allowed if there's an existing expanded item with the same parent
          !expandedRowIds
            .map((id) => tableRef.current?.getRow?.(id)?.parentId)
            .includes(row.parentId);
    },
    getSubRows: (row) => row.children as G[],
    onExpandedChange: actions.setExpandedRows,
  });

  const headerColumns = tableRef.current.getHeaderGroups()[0].headers;
  const { rows } = tableRef.current.getRowModel();

  const {
    activeStickyIndex,
    rowVirtualizer,
    virtualizedRowsSizeCache,
    virtualizedRowComputedTranslateValue,
  } = useRowVirtualizerHelper<G>({
    rows,
    overscan,
    getScrollElement: () => scrollElementRef.current,
    stickyGroupRoot,
  });

  return (
    <div css={styles.container}>
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
              >
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem
                    css={
                      (rowVirtualizer.scrollOffset ?? 0) >
                      // apply border on scrolling a quarter of the first row height
                      (virtualizedRowsSizeCache.get(0) ?? 0) / 4
                        ? styles.cascadeTreeGridHeaderScrolled
                        : {}
                    }
                  >
                    {headerColumns.map((header) => {
                      return (
                        <React.Fragment key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </React.Fragment>
                      );
                    })}
                  </EuiFlexItem>
                  <React.Fragment>
                    {activeStickyIndex !== null && stickyGroupRoot && (
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
                    role="treegrid"
                    aria-readonly="true"
                    aria-multiselectable="false"
                    aria-colcount={-1}
                    css={relativePosition}
                  >
                    {rowVirtualizer
                      .getVirtualItems()
                      .map(function buildCascadeRows(virtualItem, renderIndex) {
                        const row = rows[virtualItem.index];

                        // CONSIDERATION: maybe use the sticky index as a marker for accessibility announcements
                        const isActiveSticky =
                          stickyGroupRoot && activeStickyIndex === virtualItem.index;

                        virtualizedRowComputedTranslateValue.set(renderIndex, virtualItem.start);

                        const rowToRender = React.createElement<CascadeRowPrimitiveProps<G, L>>(
                          CascadeRowPrimitive,
                          {
                            size,
                            innerRef: rowVirtualizer.measureElement,
                            isActiveSticky,
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
