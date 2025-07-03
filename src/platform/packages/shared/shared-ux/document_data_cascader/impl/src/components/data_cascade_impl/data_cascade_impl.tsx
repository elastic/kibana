/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type Row,
  type ExpandedState,
} from '@tanstack/react-table';
import { useVirtualizer, defaultRangeExtractor } from '@tanstack/react-virtual';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SelectionDropdown } from './group_selection_combobox/selection_dropdown';
import {
  useDataCascadeState,
  useDataCascadeDispatch,
  type GroupNode,
  type LeafNode,
} from '../data_cascade_provider';
import {
  CascadeRow,
  type CascadeRowProps,
  CascadeRowCell,
  type CascadeRowCellProps,
  getCascadeRowLeafDataCacheKey,
  getCascadeRowNodePath,
  getCascadeRowNodePathValueRecord,
} from './data_cascade_row';

interface OnCascadeGroupNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
}

interface OnCascadeLeafNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * @description KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

export interface DataCascadeImplProps<G extends GroupNode, L extends LeafNode>
  extends Pick<
      CascadeRowCellProps<G, L>,
      'rowHeaderTitleSlot' | 'rowHeaderMetaSlots' | 'leafContentSlot'
    >,
    Pick<Parameters<typeof useVirtualizer>[0], 'overscan'> {
  /**
   * @description The data to be displayed in the cascade. It should be an array of group nodes.
   */
  data: G[];
  /**
   * @description Callback function that is called when the group by selection changes.
   */
  onCascadeGroupingChange: ComponentProps<typeof SelectionDropdown>['onSelectionChange'];
  /**
   * @description Callback function that is called when a cascade node is expanded.
   */
  onCascadeGroupNodeExpanded: (args: OnCascadeGroupNodeExpandedArgs<G>) => Promise<G[]>;
  /**
   * @description Callback function for leaf expansion, which can be used to fetch data for leaf nodes.
   */
  onCascadeLeafNodeExpanded: (args: OnCascadeLeafNodeExpandedArgs<G>) => Promise<L[]>;
  /**
   * @description The spacing size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  size?: CascadeRowProps<G>['rowGapSize'];
  tableTitleSlot: React.FC<{ rows: Array<Row<G>> }>;
  /**
   * @description Whether to cause the group root to stick to the top of the viewport.
   */
  stickyGroupRoot?: boolean;
}

export function DataCascadeImpl<G extends GroupNode, L extends LeafNode>({
  data,
  onCascadeGroupingChange,
  onCascadeGroupNodeExpanded,
  onCascadeLeafNodeExpanded,
  rowHeaderTitleSlot,
  rowHeaderMetaSlots,
  leafContentSlot,
  size = 'm',
  tableTitleSlot: TableTitleSlot,
  stickyGroupRoot = false,
  overscan = 10,
}: DataCascadeImplProps<G, L>) {
  const dispatch = useDataCascadeDispatch<G, L>();
  const state = useDataCascadeState<G, L>();
  const columnHelper = createColumnHelper<G>();
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // The scrollable element for your list
  const scrollElementRef = React.useRef(null);
  const virtualizerItemSizeCacheRef = React.useRef<Map<number, number>>(new Map());

  useEffect(() => {
    dispatch({
      type: 'SET_INITIAL_STATE',
      payload: data,
    });
  }, [data, dispatch]);

  const fetchGroupNodeData = useCallback(
    ({ row }: { row: Row<G> }) => {
      const dataFetchFn = async () => {
        const groupNodeData = await onCascadeGroupNodeExpanded({
          row,
          nodePath: getCascadeRowNodePath(state.currentGroupByColumns, row),
        });
        if (!groupNodeData) {
          return;
        }
        dispatch({
          type: 'UPDATE_ROW_GROUP_NODE_DATA',
          payload: {
            id: row.id,
            data: groupNodeData,
          },
        });
      };
      return dataFetchFn().catch((error) => {
        // eslint-disable-next-line no-console -- added for debugging purposes
        console.error('Error fetching data for row with ID: %s', row.id, error);
      });
    },
    [dispatch, onCascadeGroupNodeExpanded, state.currentGroupByColumns]
  );

  const fetchGroupLeafData = useCallback(
    ({ row }: { row: Row<G> }) => {
      const nodePath = getCascadeRowNodePath(state.currentGroupByColumns, row);
      const nodePathMap = getCascadeRowNodePathValueRecord(state.currentGroupByColumns, row);

      const dataFetchFn = async () => {
        const groupLeafData = await onCascadeLeafNodeExpanded({
          row,
          nodePathMap,
          nodePath,
        });

        if (!groupLeafData) {
          return;
        }

        dispatch({
          type: 'UPDATE_ROW_GROUP_LEAF_DATA',
          payload: {
            cacheKey: getCascadeRowLeafDataCacheKey(nodePath, nodePathMap, row.id),
            data: groupLeafData,
          },
        });
      };

      return dataFetchFn().catch((error) => {
        // eslint-disable-next-line no-console -- added for debugging purposes
        console.error('Error fetching data for leaf node', error);
      });
    },
    [dispatch, onCascadeLeafNodeExpanded, state.currentGroupByColumns]
  );

  const table = useReactTable<G>({
    data: state.groupNodes,
    state: {
      expanded,
    },
    /*
     * The columns of the table, in this case, we only have one column for grouping
     * and displaying the row title and meta slots.
     */
    columns: [
      columnHelper.display({
        id: 'groupBy',
        header: (props) =>
          React.createElement(function GroupByHeader({ table: _table }) {
            const { rows } = _table.getGroupedRowModel();

            return (
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                css={({ euiTheme }) => ({
                  padding: euiTheme.size.s,
                })}
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
          return (
            <CascadeRowCell<G, L>
              {...{
                ...props,
                rowHeaderTitleSlot,
                rowHeaderMetaSlots,
                leafContentSlot,
                populateGroupLeafDataFn: fetchGroupLeafData,
              }}
            />
          );
        }),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getRowCanExpand: useCallback(
      (row: Row<G>) => {
        // only allow expanding rows up until the depth of the current group by columns
        return row.depth < state.currentGroupByColumns.length;
      },
      [state.currentGroupByColumns.length]
    ),
    getSubRows: (row) => row.children as G[],
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
  });

  const headerColumns = table.getHeaderGroups()[0].headers;
  const { rows } = table.getRowModel();

  const activeStickyIndexRef = useRef<number | null>(null);
  const activeStickyRenderSlotRef = useRef<HTMLDivElement | null>(null);

  /**
   * @description range extractor, used to inform virtualizer about our rendering needs in relation to marking specific rows as sticky rows.
   * see {@link https://tanstack.com/virtual/latest/docs/api/virtualizer#rangeextractor} for more details
   */
  const rangeExtractor = useCallback<
    NonNullable<Parameters<typeof useVirtualizer>[0]['rangeExtractor']>
  >(
    (range) => {
      if (!stickyGroupRoot) {
        return defaultRangeExtractor(range);
      }

      const rangeStartRow = rows[range.startIndex];

      // TODO: get buy in to make all item parents sticky, right now we only select the top most parent as sticky
      activeStickyIndexRef.current =
        rangeStartRow.subRows?.length && rangeStartRow.getIsExpanded()
          ? rangeStartRow.index
          : rangeStartRow.getParentRows()[0]?.index ?? null;
      const next = new Set(
        [activeStickyIndexRef.current, ...defaultRangeExtractor(range)].filter(Boolean)
      );
      return Array.from(next).sort((a, b) => a - b);
    },
    [rows, stickyGroupRoot]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 0,
    getScrollElement: () => scrollElementRef.current,
    overscan,
    rangeExtractor,
    onChange: (rowVirtualizerInstance) => {
      // @ts-expect-error -- the itemsSizeCache property does exist,
      // but it not included in the type definition
      // because it is marked as a private property,
      // see {@link https://github.com/TanStack/virtual/blob/v3.13.2/packages/virtual-core/src/index.ts#L360}
      virtualizerItemSizeCacheRef.current = rowVirtualizerInstance.itemSizeCache;
    },
  });

  const virtualizedRowComputedTranslateValue = useRef(new Map());

  return (
    <div css={{ flex: '1 1 auto' }}>
      <AutoSizer>
        {(containerSize) => (
          <div ref={scrollElementRef} style={{ ...containerSize, overflowY: 'auto' }}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              css={{ width: containerSize.width, position: 'relative' }}
            >
              <EuiFlexItem
                css={({ euiTheme }) => ({
                  position: 'sticky',
                  willChange: 'transform',
                  zIndex: euiTheme.levels.header,
                  background: euiTheme.colors.backgroundBaseSubdued,
                })}
                style={{
                  top: -(virtualizedRowComputedTranslateValue.current.get(0) ?? 0),
                  transform: `translate3d(0, ${
                    virtualizedRowComputedTranslateValue.current.get(0) ?? 0
                  }px,  0)`,
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem
                    css={({ euiTheme }) => ({
                      ...((rowVirtualizer.scrollOffset ?? 0) >
                      (virtualizerItemSizeCacheRef.current.get(0) ?? 0) / 4
                        ? {
                            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                          }
                        : {}),
                    })}
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
                    {activeStickyIndexRef.current !== null && stickyGroupRoot && (
                      <EuiFlexItem
                        ref={activeStickyRenderSlotRef}
                        css={({ euiTheme }) => ({
                          position: 'relative',
                          margin: `0 ${euiTheme.size.s}`,
                        })}
                      />
                    )}
                  </React.Fragment>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <div
                  css={({ euiTheme }) => ({
                    padding: `0 ${euiTheme.size.s}`,
                    background: euiTheme.colors.backgroundBaseSubdued,
                  })}
                  style={{ height: rowVirtualizer.getTotalSize() }}
                >
                  <ul css={{ position: 'relative' }}>
                    {rowVirtualizer
                      .getVirtualItems()
                      .map(function buildCascadeRows(virtualItem, renderIndex) {
                        const row = rows[virtualItem.index];

                        // CONSIDERATION: maybe use the sticky index as a marker for accessibility announcements
                        const isActiveSticky =
                          stickyGroupRoot && activeStickyIndexRef.current === virtualItem.index;

                        virtualizedRowComputedTranslateValue.current.set(
                          renderIndex,
                          virtualItem.start
                        );

                        const rowToRender = (
                          <CascadeRow<G>
                            innerRef={rowVirtualizer.measureElement}
                            isActiveSticky={isActiveSticky}
                            populateGroupNodeDataFn={fetchGroupNodeData}
                            rowInstance={row}
                            rowGapSize={size}
                            virtualRow={virtualItem}
                            virtualRowStyle={
                              !isActiveSticky
                                ? {
                                    transform: `translateY(${
                                      virtualizedRowComputedTranslateValue.current.get(
                                        renderIndex
                                      ) ?? 0
                                    }px)`,
                                  }
                                : {}
                            }
                          />
                        );

                        return (
                          <React.Fragment>
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
                  </ul>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </AutoSizer>
    </div>
  );
}
