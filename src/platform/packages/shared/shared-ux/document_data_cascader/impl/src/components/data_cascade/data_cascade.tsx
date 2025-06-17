/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, useCallback, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  useEuiTheme,
  EuiProgress,
  EuiLoadingChart,
  type EuiThemeShape,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type Row,
  type ExpandedState,
  type CellContext,
} from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SelectionDropdown } from '../selection_dropdown';
import {
  DataCascadeProvider,
  useDataCascadeState,
  useDataCascadeDispatch,
  type GroupNode,
  type LeafNode,
} from '../../lib';

interface CascadeRowProps<T> {
  populateGroupNodeDataFn: (args: { row: Row<T> }) => Promise<void>;
  // populateGroupLeafDataFn: (args: { row: Row<T> }) => Promise<void>;
  rowInstance: Row<T>;
  /**
   * The size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  rowGapSize: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
  virtualizerInstance: ReturnType<typeof useVirtualizer>;
  virtualRow: VirtualItem;
}

interface CascadeRowCellProps<G extends GroupNode, L extends LeafNode>
  extends CellContext<G, unknown> {
  populateGroupLeafDataFn: (args: { row: Row<G> }) => Promise<void>;
  rowHeaderTitleSlot: React.FC<{ row: Row<G> }>;
  rowHeaderMetaSlots?: (props: { row: Row<G> }) => React.ReactNode[];
  leafContentSlot: React.FC<{ data: L[] | null }>;
}

interface OnGroupNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
}

interface OnGroupLeafExpandedArgs<G extends GroupNode> {
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

interface DataCascadeProps<G extends GroupNode, L extends LeafNode>
  extends Pick<
    CascadeRowCellProps<G, L>,
    'rowHeaderTitleSlot' | 'rowHeaderMetaSlots' | 'leafContentSlot'
  > {
  data: G[];
  onGroupByChange: ComponentProps<typeof SelectionDropdown>['onSelectionChange'];
  /**
   * @description Callback function that is called when a group by row is expanded.
   */
  onGroupNodeExpanded: (args: OnGroupNodeExpandedArgs<G>) => Promise<G[]>;
  /**
   * @description Callback function for leaf expansion, which can be used to fetch data for leaf nodes.
   */
  onGroupLeafExpanded: (args: OnGroupLeafExpandedArgs<G>) => Promise<L[]>;
  size?: CascadeRowProps<G>['rowGapSize'];
  tableTitleSlot: React.FC<{ rows: Array<Row<G>> }>;
}

/**
 * @description This function returns the path of the row node in the group by hierarchy.
 */
function getCascadeRowNodePath<G extends GroupNode>(currentGroupByColumns: string[], row: Row<G>) {
  return currentGroupByColumns.slice(0, row.depth + 1);
}

/**
 * @description This function returns a record of the path values for the row node.
 */
function getCascadeRowNodePathValueRecord<G extends GroupNode>(
  currentGroupByColumns: string[],
  row: Row<G>
) {
  const nodePath = getCascadeRowNodePath(currentGroupByColumns, row);

  return row.getParentRows().reduce((acc, parentRow) => {
    // TODO: This assumes that the parentRow.original.group is the value you want to use for the path.
    // provide means to adjust this logic if user's data structure is different.
    acc[nodePath[parentRow.depth]] = parentRow.original.group;
    return acc;
  }, {} as Record<string, string>);
}

function getCascadeRowLeafDataCacheKey(
  nodePath: string[],
  nodePathMap: Record<string, string>,
  leafId: string
) {
  return nodePath
    .map((path) => nodePathMap[path])
    .concat(leafId)
    .join(':');
}

function CascadeRow<G extends GroupNode>({
  populateGroupNodeDataFn,
  rowInstance,
  virtualRow,
  virtualizerInstance,
}: CascadeRowProps<G>) {
  const { euiTheme } = useEuiTheme();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = React.useState<boolean>(false);
  const cascadeRowRef = React.useRef<HTMLLIElement | null>(null);

  const fetchCascadeRowGroupNodeData = React.useCallback(() => {
    setRowGroupDataFetch(true);
    populateGroupNodeDataFn({ row: rowInstance }).finally(() => {
      setRowGroupDataFetch(false);
    });
  }, [populateGroupNodeDataFn, rowInstance]);

  const onCascadeRowClick = React.useCallback(
    (isGroupNode: boolean) => {
      rowInstance.toggleExpanded();
      if (isGroupNode) {
        // Can expand here denotes it still has some nesting, hence we need to fetch the data for the sub-rows
        fetchCascadeRowGroupNodeData();
      }
    },
    [fetchCascadeRowGroupNodeData, rowInstance]
  );

  return (
    <li
      key={rowInstance.id}
      data-index={virtualRow.index}
      data-row-type={rowInstance.depth === 0 ? 'root' : 'sub-group'}
      ref={(el) => virtualizerInstance.measureElement((cascadeRowRef.current = el))}
      style={{
        display: 'flex',
        position: 'absolute',
        transform: `translateY(${virtualRow.start}px)`, // this should always be a `style` as it changes on scroll
        width: '100%',
      }}
      css={{
        padding: euiTheme.size.s,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        ...(!rowInstance.parentId
          ? {
              borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            }
          : {
              paddingTop: 0,
              paddingBottom: 0,
            }),
        '&[data-row-type="root"]:first-of-type': {
          borderTopLeftRadius: euiTheme.border.radius.small,
          borderTopRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type': {
          borderBottomLeftRadius: euiTheme.border.radius.small,
          borderBottomRightRadius: euiTheme.border.radius.small,
        },
      }}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        css={{
          position: 'relative',
          ...(rowInstance.parentId && rowInstance.getIsAllParentsExpanded()
            ? {
                padding: `${euiTheme.base / 2}px ${
                  (euiTheme.base / 2) * (rowInstance.depth + 1)
                }px`,
                borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                backgroundColor: euiTheme.colors.backgroundBasePlain,
              }
            : {}),
          '[data-row-type="root"] + [data-row-type="sub-group"] &': {
            borderTopLeftRadius: euiTheme.border.radius.small,
            borderTopRightRadius: euiTheme.border.radius.small,
          },
          '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &': {
            marginBottom: euiTheme.size.s,
            borderBottomLeftRadius: euiTheme.border.radius.small,
            borderBottomRightRadius: euiTheme.border.radius.small,
            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },
        }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={rowInstance.getIsExpanded() ? 'arrowDown' : 'arrowRight'}
            onClick={onCascadeRowClick.bind(null, rowInstance.getCanExpand())}
            aria-label={i18n.translate('sharedUXPackages.dataCascade.removeRowButtonLabel', {
              defaultMessage: 'expand row',
            })}
            data-test-subj={`expand-row-${rowInstance.id}-button`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <React.Fragment>
            {isPendingRowGroupDataFetch && (
              <EuiProgress
                size="xs"
                color="accent"
                position={rowInstance.depth === 0 ? 'fixed' : 'absolute'}
              />
            )}
          </React.Fragment>
          <React.Fragment>
            {rowInstance.getVisibleCells().map((cell) => {
              return (
                <React.Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        </EuiFlexItem>
      </EuiFlexGroup>
    </li>
  );
}

function CascadeRowCell<G extends GroupNode, L extends LeafNode>({
  row,
  populateGroupLeafDataFn,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  leafContentSlot: LeafContentSlot,
}: CascadeRowCellProps<G, L>) {
  const { leafNodes, currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowLeafDataFetch, setRowLeafDataFetch] = React.useState<boolean>(false);
  const isLeafNode = !row.getCanExpand();
  const getLeafCacheKey = useCallback(() => {
    return getCascadeRowLeafDataCacheKey(
      getCascadeRowNodePath(currentGroupByColumns, row),
      getCascadeRowNodePathValueRecord(currentGroupByColumns, row),
      row.id
    );
  }, [currentGroupByColumns, row]);

  const leafData = useMemo(() => {
    return isLeafNode ? leafNodes.get(getLeafCacheKey()) ?? null : null;
  }, [getLeafCacheKey, isLeafNode, leafNodes]);

  React.useEffect(() => {
    if (!leafData && isLeafNode && row.getIsExpanded() && !isPendingRowLeafDataFetch) {
      flushSync(() => setRowLeafDataFetch(true)); // immediately mark as pending to avoid multiple re-renders
      populateGroupLeafDataFn({ row }).finally(() => {
        setRowLeafDataFetch(false);
      });
    }
  }, [isLeafNode, isPendingRowLeafDataFetch, leafData, populateGroupLeafDataFn, row]);

  return (
    <EuiFlexGroup direction="column" css={{ padding: `0 ${8 * row.depth}px` }}>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={4}>
            <RowTitleSlot row={row} />
          </EuiFlexItem>
          <EuiFlexItem grow={6}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              {rowHeaderMetaSlots?.({ row }).map((metaSlot, index) => (
                <EuiFlexItem key={index}>{metaSlot}</EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <React.Fragment>
        {isLeafNode && row.getIsAllParentsExpanded() && row.getIsExpanded() && (
          <EuiFlexItem grow={10}>
            {isPendingRowLeafDataFetch ? (
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <LeafContentSlot data={leafData} />
            )}
          </EuiFlexItem>
        )}
      </React.Fragment>
    </EuiFlexGroup>
  );
}

function DataCascadeImpl<T extends GroupNode, L extends LeafNode>({
  data,
  onGroupByChange,
  onGroupNodeExpanded,
  onGroupLeafExpanded,
  rowHeaderTitleSlot,
  rowHeaderMetaSlots,
  leafContentSlot,
  size = 'm',
  tableTitleSlot: TableTitleSlot,
}: DataCascadeProps<T, L>) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const dispatch = useDataCascadeDispatch();
  const state = useDataCascadeState<T, L>();
  const columnHelper = createColumnHelper<T>();
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  useEffect(() => {
    dispatch({
      type: 'SET_INITIAL_STATE',
      payload: data,
    });
  }, [data, dispatch]);

  const fetchGroupNodeData = useCallback(
    ({ row }: { row: Row<T> }) => {
      const dataFetchFn = async () => {
        const groupNodeData = await onGroupNodeExpanded({
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
    [dispatch, onGroupNodeExpanded, state.currentGroupByColumns]
  );

  const fetchGroupLeafData = useCallback(
    ({ row }: { row: Row<T> }) => {
      const nodePath = getCascadeRowNodePath(state.currentGroupByColumns, row);
      const nodePathMap = getCascadeRowNodePathValueRecord(state.currentGroupByColumns, row);

      const dataFetchFn = async () => {
        const groupLeafData = await onGroupLeafExpanded({
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
    [dispatch, onGroupLeafExpanded, state.currentGroupByColumns]
  );

  const table = useReactTable<T>({
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
                  <SelectionDropdown onSelectionChange={onGroupByChange} />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }, props),
        cell: React.memo((props) => {
          return (
            <CascadeRowCell<T, L>
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
      (row: Row<T>) => {
        // only allow expanding rows up until the depth of the current group by columns
        return row.depth < state.currentGroupByColumns.length;
      },
      [state.currentGroupByColumns.length]
    ),
    getSubRows: (row) => row.children,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
  });

  const headerColumns = table.getHeaderGroups()[0].headers;
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 0,
    overscan: 5,
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
                    top: -rowVirtualizer.measurementsCache[0].size,
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
                        <CascadeRow<T>
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

export function DataCascade<N extends GroupNode = GroupNode, L extends LeafNode = LeafNode>({
  query,
  ...props
}: DataCascadeProps<N, L> & ComponentProps<typeof DataCascadeProvider>) {
  return (
    <DataCascadeProvider query={query}>
      <DataCascadeImpl<N, L> {...props} />
    </DataCascadeProvider>
  );
}
