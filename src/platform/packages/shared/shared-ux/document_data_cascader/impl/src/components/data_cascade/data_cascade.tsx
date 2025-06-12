/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, useEuiTheme, EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type Row,
  type ExpandedState,
} from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SelectionDropdown } from '../selection_dropdown';
import {
  DataCascadeProvider,
  useDataCascadeState,
  useDataCascadeDispatch,
  type DocWithId,
  type IStoreState,
} from '../../lib';

interface DataCascadeProps<T extends DocWithId> {
  /**
   * The size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  size?: 's' | 'm' | 'l';
  data: T[];
  onGroupByChange?: (groupBy: string) => void;
  onGroupByRowExpanded?: (args: { row: Row<T>; state: IStoreState<T> }) => Promise<T[]>;
  rowHeaderTitleSlot: React.FC<{ row: Row<T> }>;
  rowHeaderMetaSlots?: (props: { row: Row<T> }) => React.ReactNode[];
  rowContentSlot: React.FC<{ row: Row<T> }>;
  tableTitleSlot: React.FC<{ rows: Array<Row<T>> }>;
}

interface CascadeRowProps<T extends DocWithId> {
  populateRowDataFn: () => Promise<void>;
  rowInstance: Row<T>;
  virtualizerInstance: ReturnType<typeof useVirtualizer>;
  virtualRow: VirtualItem;
}

function CascadeRow<T>({
  populateRowDataFn,
  rowInstance,
  virtualRow,
  virtualizerInstance,
}: CascadeRowProps<T>) {
  const { euiTheme } = useEuiTheme();
  const [isPendingRowDataFetch, setRowDataFetch] = React.useState<boolean>(false);
  const cascadeRowRef = React.useRef<HTMLLIElement | null>(null);

  const fetchCascadeRowData = React.useCallback(() => {
    setRowDataFetch(true);
    populateRowDataFn().finally(() => {
      setRowDataFetch(false);
    });
  }, [populateRowDataFn]);

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
          '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &': {
            marginBottom: euiTheme.size.s,
            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },
        }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={rowInstance.getIsExpanded() ? 'arrowDown' : 'arrowRight'}
            onClick={() => {
              rowInstance.toggleExpanded();
              fetchCascadeRowData();
            }}
            aria-label={i18n.translate('sharedUXPackages.dataCascade.removeRowButtonLabel', {
              defaultMessage: 'expand row',
            })}
            data-test-subj={`expand-row-${rowInstance.id}-button`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <React.Fragment>
            {isPendingRowDataFetch && (
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

function DataCascadeImpl<T extends DocWithId>({
  data,
  onGroupByChange,
  onGroupByRowExpanded,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowContentSlot: RowContentSlot,
  tableTitleSlot: TableTitleSlot,
}: DataCascadeProps<T>) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const dispatch = useDataCascadeDispatch();
  const state = useDataCascadeState<T>();
  const columnHelper = createColumnHelper<T>();
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  useEffect(() => {
    dispatch({
      type: 'SET_INITIAL_STATE',
      payload: data,
    });
  }, [data, dispatch]);

  const fetchSubRowData = useCallback(
    ({ row }: { row: Row<T> }) => {
      const dataFetchFn = async () => {
        const rowData = await onGroupByRowExpanded?.({ row, state });
        if (!rowData) {
          return;
        }
        dispatch({
          type: 'UPDATE_ROW_DATA',
          payload: {
            id: row.id,
            data: rowData,
          },
        });
      };
      return dataFetchFn().catch((error) => {
        // eslint-disable-next-line no-console -- added for debugging purposes
        console.error('Error fetching data for row with ID: %s', row.id, error);
      });
    },
    [dispatch, onGroupByRowExpanded, state]
  );

  const table = useReactTable<T>({
    data: state.data,
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
        cell: (props) =>
          React.createElement(function GroupByCell({ row }) {
            return (
              <EuiFlexGroup direction="column" css={{ padding: `0 ${8 * row.depth}px` }}>
                <EuiFlexItem>
                  <EuiFlexGroup direction="row">
                    <EuiFlexItem grow={4}>
                      <RowTitleSlot row={row} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={6}>
                      {rowHeaderMetaSlots?.({ row }).map((metaSlot, index) => (
                        <React.Fragment key={index}>{metaSlot}</React.Fragment>
                      ))}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <React.Fragment>
                  {!row.getCanExpand() &&
                    row.getIsExpanded() &&
                    row.getIsAllParentsExpanded() &&
                    row.depth !== 0 && <RowContentSlot row={row} />}
                </React.Fragment>
              </EuiFlexGroup>
            );
          }, props),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    getSubRows: (row) => row.children,
    getRowId: (row) => row.id,
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
                    return flexRender(header.column.columnDef.header, header.getContext());
                  })}
                </EuiFlexItem>
                <EuiFlexItem>
                  <ul>
                    {rowVirtualizer.getVirtualItems().map(function buildCascadeRows(virtualItem) {
                      const row = rows[virtualItem.index];
                      return React.createElement(CascadeRow, {
                        key: virtualItem.index,
                        populateRowDataFn: fetchSubRowData.bind(null, { row }),
                        rowInstance: row,
                        virtualRow: virtualItem,
                        virtualizerInstance: rowVirtualizer,
                      });
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

export function DataCascade<T extends DocWithId>({
  query,
  ...props
}: DataCascadeProps<T> & ComponentProps<typeof DataCascadeProvider>) {
  return (
    <DataCascadeProvider query={query}>
      <DataCascadeImpl<T> {...props} />
    </DataCascadeProvider>
  );
}
