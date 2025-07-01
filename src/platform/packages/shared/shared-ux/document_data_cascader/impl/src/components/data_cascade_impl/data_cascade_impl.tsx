/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, useCallback, useEffect } from 'react';
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
import { useVirtualizer } from '@tanstack/react-virtual';
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
  overscan = 10,
}: DataCascadeImplProps<G, L>) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const virtualizerItemSizeRef = React.useRef<Map<number, number>>(new Map());
  const headerRowTranslationValueRef = React.useRef(0);
  const dispatch = useDataCascadeDispatch();
  const state = useDataCascadeState<G, L>();
  const columnHelper = createColumnHelper<G>();
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

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
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
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

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 0,
    overscan,
    // onChange: (rowVirtualizerInstance) => {
    // },
  });

  return (
    <div css={{ flex: '1 1 auto' }}>
      <AutoSizer>
        {(containerSize) => (
          <div ref={parentRef} style={{ ...containerSize, overflowY: 'auto' }}>
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem
                  css={{
                    position: 'sticky',
                    top: -(rowVirtualizer.measurementsCache[0] || {}).size,
                    zIndex: 1,
                    willChange: 'transform',
                  }}
                >
                  {headerColumns.map((header) => {
                    return (
                      <React.Fragment key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </React.Fragment>
                    );
                  })}
                </EuiFlexItem>
                <EuiFlexItem>
                  <ul>
                    {rowVirtualizer.getVirtualItems().map(function buildCascadeRows(virtualItem) {
                      const row = rows[virtualItem.index];
                      return (
                        <CascadeRow<G>
                          key={virtualItem.key}
                          populateGroupNodeDataFn={fetchGroupNodeData}
                          rowInstance={row}
                          rowGapSize={size}
                          virtualizerInstance={rowVirtualizer}
                          virtualRow={virtualItem}
                        />
                      );
                    })}
                  </ul>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>
        )}
      </AutoSizer>
    </div>
  );
}
