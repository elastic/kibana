/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiStat,
  EuiDataGrid,
  EuiPanel,
  useEuiTheme,
  type HorizontalAlignment,
  type EuiDataGridColumn,
  type EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import type { StoryObj } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
  type LeafNode,
  type ChildVirtualizerController,
  useConnectedChildVirtualizer,
} from '../../..';
import type { MockGroupData } from '../../__fixtures__/types';

type ChildVirtualizerRows = Parameters<typeof useConnectedChildVirtualizer>[0]['rows'];

interface CustomCascadeGridBodyProps
  extends EuiDataGridCustomBodyProps,
    Pick<CascadeLeafCellContentProps, 'virtualizerController' | 'cellId' | 'rowIndex'> {
  data: LeafNode[];
  isFullScreenMode?: boolean;
}

interface CascadeLeafCellContentProps {
  data: LeafNode[];
  cellId: string;
  rowIndex: number;
  virtualizerController: ChildVirtualizerController;
  columns: EuiDataGridColumn[];
}

/**
 * Custom grid body that replaces the default EuiDataGrid scrolling with a
 * child virtualizer connected to the parent Data Cascade scroll context.
 * This allows the nested grid rows to scroll in sync with the cascade.
 */
const CustomCascadeGridBodyMemoized = React.memo(function CustomCascadeGridBody({
  data,
  virtualizerController,
  cellId,
  rowIndex,
  isFullScreenMode,
  Cell,
  visibleColumns,
  visibleRowData,
  headerRow,
  footerRow,
}: CustomCascadeGridBodyProps) {
  const visibleRows = useMemo(
    () => data.slice(visibleRowData.startRow, visibleRowData.endRow),
    [data, visibleRowData.startRow, visibleRowData.endRow]
  );

  const customGridBodyScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { euiTheme } = useEuiTheme();

  const { virtualizer, handle, isDetached } = useConnectedChildVirtualizer({
    controller: virtualizerController,
    cellId,
    rowIndex,
    // The hook requires Row<G>[] but only uses rows.length for child virtualizers
    rows: visibleRows as unknown as ChildVirtualizerRows,
    estimatedRowHeight: 34,
    overscan: 10,
    privateScrollElement: customGridBodyScrollContainerRef,
  });

  useLayoutEffect(() => {
    if (isFullScreenMode && !isDetached) {
      handle.detachScrollElement();
    } else if (!isFullScreenMode && isDetached) {
      handle.reattachScrollElement();
    }
  }, [isFullScreenMode, isDetached, handle]);

  const items = virtualizer.getVirtualItems();
  const scrollMargin = isDetached ? 0 : virtualizer.measurementsCache[0]?.start ?? 0;
  const translateY = items.length > 0 ? items[0].start - scrollMargin : 0;

  return (
    <div
      role="rowgroup"
      css={css({
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        '& .euiDataGridHeader': {
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        },
        '& .euiDataGridRow': {
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        },
      })}
    >
      <>{headerRow}</>
      <div
        ref={customGridBodyScrollContainerRef}
        css={css({
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
          scrollbarWidth: 'thin',
        })}
      >
        <div style={{ height: virtualizer.getTotalSize() }}>
          <div
            css={css({
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              overflowAnchor: 'none',
              willChange: 'transform',
              '& > .euiDataGridRow:last-child .euiDataGridRowCell:not(.euiDataGridFooterCell)': {
                borderBlockEnd: 'none',
              },
            })}
            style={{ transform: `translateY(${translateY}px)` }}
          >
            {items.map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="euiDataGridRow"
                css={css({ display: 'flex' })}
              >
                {visibleColumns.map((column, colIndex) => (
                  <Cell
                    key={`${virtualRow.index}-${colIndex}`}
                    colIndex={colIndex}
                    rowIndex={virtualRow.index}
                    visibleRowIndex={virtualRow.index}
                    columnId={column.id}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {footerRow}
    </div>
  );
});

const CascadeLeafCellContent = React.memo(function CascadeLeafCellContent({
  data,
  cellId,
  rowIndex,
  virtualizerController,
  columns,
}: CascadeLeafCellContentProps) {
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  const renderCellValue = useCallback<
    NonNullable<ComponentProps<typeof EuiDataGrid>['renderCellValue']>
  >(
    ({ rowIndex: cellRowIndex, columnId }) => {
      const row = data[cellRowIndex];
      return row ? <>{row[columnId]}</> : null;
    },
    [data]
  );

  const renderCustomGridBody = useCallback<
    NonNullable<ComponentProps<typeof EuiDataGrid>['renderCustomGridBody']>
  >(
    (gridBodyProps) => (
      <CustomCascadeGridBodyMemoized
        {...gridBodyProps}
        data={data}
        virtualizerController={virtualizerController}
        cellId={cellId}
        rowIndex={rowIndex}
      />
    ),
    [data, virtualizerController, cellId, rowIndex]
  );

  return (
    <EuiPanel paddingSize="none">
      <EuiDataGrid
        aria-label="Nested virtualized data grid"
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={data.length}
        renderCellValue={renderCellValue}
        renderCustomGridBody={renderCustomGridBody}
      />
    </EuiPanel>
  );
});

/**
 * Story for demonstrating the cascade component with nested virtualization at the cell level.
 * When a leaf cell expands, it renders an EuiDataGrid whose rows are virtualized via
 * a child virtualizer connected to the parent cascade's shared scroll context.
 */
export const CascadeWithNestedVirtualization: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  render: function DataCascadeWrapper(args, context) {
    const groupByFields = useMemo(
      () => getESQLStatsQueryMeta(args.query).groupByFields.map(({ field }) => field),
      [args.query]
    );

    const generateGroupFieldRecord = useCallback(
      (nodePath?: string[], nodePathMap?: Record<string, string>) => {
        return groupByFields.reduce<Record<string, string>>((acc, field) => {
          return {
            ...acc,
            [field]:
              nodePathMap && nodePath?.indexOf(field) !== -1
                ? nodePathMap[field]
                : /clientip/.test(field)
                ? faker.internet.ipv4()
                : /url\.keyword/.test(field)
                ? faker.internet.url({ protocol: 'https' })
                : faker.person.fullName(),
          };
        }, {} as Record<string, string>);
      },
      [groupByFields]
    );

    const initData: MockGroupData[] = useMemo(
      () =>
        new Array(10000).fill(null).map((_, index) => {
          return {
            id: faker.string.uuid(),
            index: index + 1,
            count: faker.number.int({ min: 1, max: 1000 }),
            customer_email: faker.internet.email(),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const tableTitleSlot = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['tableTitleSlot']>
    >(
      () => (
        <EuiText>
          <FormattedMessage
            id="sharedUXPackages.data_cascade.nestedVirtualization.toolbar.queryString"
            defaultMessage="{entitiesCount} {entitiesAlias} | {groupCount} groups"
            values={{
              entitiesCount: initData.reduce((acc, row) => acc + row.count, 0),
              groupCount: initData.length,
              entitiesAlias: 'documents',
            }}
          />
        </EuiText>
      ),
      [initData]
    );

    const onCascadeGroupingChange = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['onCascadeGroupingChange']>
    >((groupBy) => {
      // eslint-disable-next-line no-console -- Handle group by change if needed
      console.log('Group By Changed:', groupBy);
    }, []);

    const onCascadeGroupNodeExpanded = useCallback<
      DataCascadeRowProps<MockGroupData, LeafNode>['onCascadeGroupNodeExpanded']
    >(
      async ({ row, nodePath, nodePathMap }) => {
        // Simulate a data fetch on row expansion
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              new Array(row.count).fill(null).map(() => {
                return {
                  id: faker.string.uuid(),
                  count: faker.number.int({ min: 1, max: row.count }),
                  ...generateGroupFieldRecord(nodePath, nodePathMap),
                };
              })
            );
          }, 3000);
        });
      },
      [generateGroupFieldRecord]
    );

    const rowHeaderTitleSlot = useCallback<
      DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderTitleSlot']
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      return (
        <EuiText>
          <h2>{rowData[rowGroup]}</h2>
        </EuiText>
      );
    }, []);

    const rowHeaderMetaSlots = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderMetaSlots']>
    >(({ rowData }) => {
      return [
        <EuiStat
          reverse
          title={rowData.count}
          textAlign="right"
          description={
            <FormattedMessage
              id="sharedUXPackages.data_cascade.nestedVirtualization.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
              }}
            />
          }
        />,
      ];
    }, []);

    const onCascadeLeafNodeExpanded = useCallback<
      DataCascadeRowCellProps<MockGroupData, LeafNode>['onCascadeLeafNodeExpanded']
    >(
      async ({ row, nodePathMap, nodePath }) => {
        // Simulate a data fetch for the expanded leaf,
        // ideally we'd want to use nodePath information to fetch this data
        return new Promise<LeafNode[]>((resolve) => {
          setTimeout(() => {
            resolve(
              new Array(row.count).fill(null).map(() => {
                return {
                  id: faker.string.uuid(),
                  ...generateGroupFieldRecord(nodePath, nodePathMap),
                };
              })
            );
          }, 3000);
        });
      },
      [generateGroupFieldRecord]
    );

    const cascadeLeafCellRenderer = useCallback<
      DataCascadeRowCellProps<MockGroupData, LeafNode>['children']
    >(
      ({ data, cellId, virtualizerController, rowIndex }) => {
        const columns: EuiDataGridColumn[] = [
          { id: 'id', displayAsText: 'ID' },
          ...groupByFields.map((field, index, groupArray) => ({
            id: field,
            displayAsText: field.replace(/_/g, ' '),
            ...(index === groupArray.length - 1 ? { align: 'right' as HorizontalAlignment } : {}),
          })),
        ];

        return (
          <CascadeLeafCellContent
            data={data ?? []}
            cellId={cellId}
            rowIndex={rowIndex}
            virtualizerController={virtualizerController}
            columns={columns}
          />
        );
      },
      [groupByFields]
    );

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      const groupValue = rowData[rowGroup];

      return [
        {
          iconType: 'reporter',
          'aria-label': `investigate ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for starting an investigation */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.nestedVirtualization.row.investigate"
              defaultMessage="Investigate"
            />
          ),
        },
        {
          iconType: 'flag',
          'aria-label': `flag ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for flagging */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.nestedVirtualization.row.flag"
              defaultMessage="Flag"
            />
          ),
        },
        {
          iconType: 'bell',
          'aria-label': `Create alert for ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for create alerts */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.nestedVirtualization.row.createAlerts"
              defaultMessage="Create alerts"
            />
          ),
        },
        {
          iconType: 'download',
          'aria-label': `Download records of ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for download */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.nestedVirtualization.row.download"
              defaultMessage="Download"
            />
          ),
        },
      ];
    }, []);

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h3>{context.name}</h3>
              <p>
                It is possible to have a Data Cascade with nested virtualization at row content
                level, this is useful when your row content also needs to be virtualized and
                you&apos;d like to connect the scrollable element of the row content to the same
                scrollable element of the Data Cascade. This example leverages the
                euiDataGrid&apos;s renderCustomGridBody prop to render a custom grid body that is
                virtualized. The custom grid body is virtualized using the&nbsp;
                <b>
                  <em>useConnectedChildVirtualizer</em>
                </b>
                &nbsp; hook, which is a hook that returns a child virtualizer that gets connected to
                a parent virtualizer&nbsp; leveraging the virtualizer controller provided by render
                prop for the cascade leaf cell.
              </p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            tableTitleSlot={tableTitleSlot}
            onCascadeGroupingChange={onCascadeGroupingChange}
          >
            <DataCascadeRow<MockGroupData, LeafNode>
              onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
              rowHeaderTitleSlot={rowHeaderTitleSlot}
              rowHeaderMetaSlots={rowHeaderMetaSlots}
              rowHeaderActions={rowHeaderActions}
            >
              <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
                {cascadeLeafCellRenderer}
              </DataCascadeRowCell>
            </DataCascadeRow>
          </DataCascade>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  argTypes: {
    query: {
      type: 'string' as const,
      description: 'Simulation of The ES|QL query that the user provided into the esql editor,',
    },
    size: {
      control: 'radio',
      options: ['s', 'm', 'l'],
      description: 'Size of the cascade rows',
    },
  },
  args: {
    query: 'FROM kibana_sample_data_logs | STATS count = COUNT() BY clientip, url.keyword',
    size: 'm',
  },
};

CascadeWithNestedVirtualization.parameters = { docs: { disable: true } };
