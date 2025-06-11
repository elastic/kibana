/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useTransition } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  useEuiTheme,
  EuiProgress,
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
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import AutoSizer from 'react-virtualized-auto-sizer';
import { SelectionDropdown } from '../selection_dropdown';
import { useDataCascadeState, useDataCascadeDispatch } from '../../lib';

interface DataCascadeRow {
  id: string;
  children?: DataCascadeRow[];
}

interface DataCascadeProps<T extends DataCascadeRow> {
  /**
   * The size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  size?: 's' | 'm' | 'l';
  data: T[];
  onGroupByChange?: (groupBy: string) => void;
  onGroupByRowExpanded?: (row: Row<T>) => Promise<DataCascadeRow[]>;
  rowHeaderTitleSlot: React.FC<{ row: Row<T> }>;
  rowHeaderMetaSlots?: (props: { row: Row<T> }) => React.ReactNode[];
  rowContentSlot: React.FC<{ row: Row<T> }>;
}

export function DataCascade<T extends DataCascadeRow>({
  data,
  onGroupByChange,
  onGroupByRowExpanded,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowContentSlot: RowContentSlot,
}: DataCascadeProps<T>) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const { euiTheme } = useEuiTheme();
  const dispatch = useDataCascadeDispatch();
  const state = useDataCascadeState();
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
      if (onGroupByRowExpanded) {
        const dataFetchFn = async () => {
          const rowData = await onGroupByRowExpanded(row);
          dispatch({
            type: 'UPDATE_ROW_DATA',
            payload: {
              id: row.id,
              data: rowData,
            },
          });
        };
        dataFetchFn().catch((error) => {
          // eslint-disable-next-line no-console -- added for debugging purposes
          console.error('Error fetching sub-row data:', error);
        });
      }
    },
    [dispatch, onGroupByRowExpanded]
  );

  const table = useReactTable({
    data: state.data as T[],
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
                  <EuiText>
                    {i18n.translate('sharedUXPackages.data_cascade.toolbar.query_string', {
                      defaultMessage: '{entitiesCount} {entitiesAlias} | {groupCount} groups',
                      values: {
                        entitiesCount: rows.reduce((acc, row) => acc + row.original.count, 0),
                        groupCount: rows.length,
                        entitiesAlias: 'documents',
                      },
                    })}
                  </EuiText>
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

                      return React.createElement(
                        function CascadeRow() {
                          const [isPendingRowDataFetch, startRowDataFetchTransition] =
                            useTransition();
                          const cascadeRowRef = React.useRef<HTMLLIElement | null>(null);

                          return (
                            <li
                              key={row.id}
                              data-index={virtualItem.index}
                              data-row-type={row.depth === 0 ? 'root' : 'sub-group'}
                              ref={(el) =>
                                rowVirtualizer.measureElement((cascadeRowRef.current = el))
                              }
                              style={{
                                display: 'flex',
                                position: 'absolute',
                                transform: `translateY(${virtualItem.start}px)`, // this should always be a `style` as it changes on scroll
                                width: '100%',
                              }}
                              css={{
                                padding: euiTheme.size.s,
                                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                                borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                                borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                                ...(!row.parentId
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
                                  ...(row.parentId && row.getIsAllParentsExpanded()
                                    ? {
                                        padding: `${euiTheme.base / 2}px ${
                                          (euiTheme.base / 2) * (row.depth + 1)
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
                                    iconType={row.getIsExpanded() ? 'arrowDown' : 'arrowRight'}
                                    onClick={() => {
                                      row.toggleExpanded();
                                      startRowDataFetchTransition(() => fetchSubRowData({ row }));
                                    }}
                                    aria-label={i18n.translate(
                                      'sharedUXPackages.dataCascade.removeRowButtonLabel',
                                      {
                                        defaultMessage: 'expand row',
                                      }
                                    )}
                                    data-test-subj={`expand-row-${row.id}-button`}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <React.Fragment>
                                    {isPendingRowDataFetch && (
                                      <EuiProgress size="xs" color="accent" position="fixed" />
                                    )}
                                  </React.Fragment>
                                  <React.Fragment>
                                    {row.getVisibleCells().map((cell) => {
                                      return (
                                        <React.Fragment key={cell.id}>
                                          {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </React.Fragment>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </li>
                          );
                        },
                        { key: virtualItem.index }
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
