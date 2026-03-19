/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useMemo, type ComponentProps } from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiHealth,
  EuiStat,
  EuiIcon,
  EuiButtonGroup,
  EuiWrappingPopover,
  EuiFilterGroup,
  EuiFilterButton,
  type HorizontalAlignment,
  EuiTextColor,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type LeafNode,
  type DataCascadeProps,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '../components';
import type { MockGroupData } from '../__fixtures__/types';
import mdx from './guide.mdx';

/**
 * @description story for data document cascade component which allows rendering of data in a quasi tree structure',
 * this story emulates ES|QL scenario of doing stats on a dataset to show the data grouped by some fields.
 */
export default {
  title: 'Data Cascade/Configuration Examples',
  component: DataCascade,
  subcomponents: { DataCascadeRow, DataCascadeRowCell },
  parameters: {
    docs: {
      page: mdx,
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

function useCustomTableHeader({ headerTitle }: { headerTitle: React.ReactNode }) {
  return useCallback<NonNullable<DataCascadeProps<MockGroupData, LeafNode>['customTableHeader']>>(
    ({ currentSelectedColumns, availableColumns, onGroupSelection }) => (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>{headerTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>Group by:</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonGroup
                legend="select columns"
                idSelected={currentSelectedColumns[0]}
                options={availableColumns.map((col) => ({ id: col, label: col }))}
                onChange={(id) => {
                  onGroupSelection([id]);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [headerTitle]
  );
}

function useRowHeaderTitleSlot() {
  return useCallback<
    NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderTitleSlot']>
  >(({ rowData, nodePath }) => {
    const rowGroup = nodePath[nodePath.length - 1];
    return (
      <EuiText>
        <h2>{rowData[rowGroup]}</h2>
      </EuiText>
    );
  }, []);
}

export const CascadeNestedGridImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Nested Groups with Default Header',
  render: function DataCascadeWrapper(args) {
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
                : /purchase_date/.test(field)
                ? faker.date.past({ years: 2 }).toLocaleDateString()
                : /order_value/.test(field)
                ? faker.commerce.price({ min: 100, max: 10000, symbol: '$' })
                : faker.person.fullName(),
          };
        }, {} as Record<string, string>);
      },
      [groupByFields]
    );

    const initData: MockGroupData[] = useMemo(
      () =>
        new Array(100).fill(null).map(() => {
          return {
            id: faker.string.uuid(),
            count: faker.number.int({ min: 1, max: 100 }),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const onCascadeGroupingChange = useCallback<
      NonNullable<DataCascadeProps<MockGroupData, LeafNode>['onCascadeGroupingChange']>
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

    const tableTitleSlot = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['tableTitleSlot']>
    >(
      () => (
        <EuiText>
          {i18n.translate('sharedUXPackages.data_cascade.toolbar.query_string', {
            defaultMessage: '{entitiesCount} {entitiesAlias} | {groupCount} groups',
            values: {
              entitiesCount: initData.reduce((acc, row) => acc + row.count, 0),
              groupCount: initData.length,
              entitiesAlias: 'documents',
            },
          })}
        </EuiText>
      ),
      [initData]
    );

    const rowHeaderTitleSlot = useRowHeaderTitleSlot();

    const rowHeaderMetaSlots = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderMetaSlots']>
    >(
      ({ rowDepth, rowData, nodePath }) => {
        const rowGroup = nodePath[nodePath.length - 1];
        const baseSlotDef: React.ReactNode[] = [];

        // Only show the count stat on the last grouping level
        return rowDepth === groupByFields.length - 1
          ? [
              <EuiStat
                reverse
                title={rowData.count}
                textAlign="right"
                description={
                  <FormattedMessage
                    id="sharedUXPackages.data_cascade.demo.row.count"
                    defaultMessage="<indicator>count</indicator>"
                    values={{
                      identifier: rowData[rowGroup] ?? '',
                      indicator: (chunks) => (
                        <EuiHealth color="subdued">
                          <EuiText>
                            <p>{chunks}</p>
                          </EuiText>
                        </EuiHealth>
                      ),
                    }}
                  />
                }
              />,
              ...baseSlotDef,
            ]
          : baseSlotDef;
      },
      [groupByFields]
    );

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(
      () => [
        {
          iconType: 'arrowDown',
          iconSide: 'right',
          onClick: () => {
            /** Noop click handler */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.action"
              defaultMessage="Take action"
            />
          ),
        },
      ],
      []
    );

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

    const rowCellRenderer = useCallback<
      DataCascadeRowCellProps<MockGroupData, LeafNode>['children']
    >(
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="nested groups with default header table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
          />
        );
      },
      [groupByFields]
    );

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            initialGroupColumn={groupByFields}
            tableTitleSlot={tableTitleSlot}
            onCascadeGroupingChange={onCascadeGroupingChange}
          >
            <DataCascadeRow
              onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
              rowHeaderTitleSlot={rowHeaderTitleSlot}
              rowHeaderMetaSlots={rowHeaderMetaSlots}
              rowHeaderActions={rowHeaderActions}
            >
              <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
                {rowCellRenderer}
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
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
    },
    size: {
      name: 'Size',
      control: 'radio',
      options: ['s', 'm', 'l'],
      description: 'Size of the cascade rows',
    },
  },
  args: {
    query:
      'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) by customer_full_name, purchase_date , order_value ',
    size: 'm',
  },
};

/**
 * This story demonstrates a custom header with one level of grouping,
 */
export const CascadeCustomHeaderImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Custom header with one level of grouping',
  render: function DataCascadeWrapper(args) {
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
                : /purchase_date/.test(field)
                ? faker.date.past({ years: 2 }).toLocaleDateString()
                : /order_value/.test(field)
                ? faker.commerce.price({ min: 100, max: 10000, symbol: '$' })
                : faker.person.fullName(),
          };
        }, {} as Record<string, string>);
      },
      [groupByFields]
    );

    const initData: MockGroupData[] = new Array(100).fill(null).map(() => {
      return {
        id: faker.string.uuid(),
        count: faker.number.int({ min: 1, max: 100 }),
        ...generateGroupFieldRecord(),
      };
    });

    const customTableHeader = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['customTableHeader']>
    >(
      ({ currentSelectedColumns, availableColumns, onGroupSelection }) => (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="database" size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiText>
                  <h2>Customer Orders Overview</h2>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <strong>Group by:</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  legend="select columns"
                  idSelected={currentSelectedColumns[0]}
                  options={availableColumns.map((col) => ({ id: col, label: col }))}
                  onChange={(id) => {
                    onGroupSelection([id]);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      []
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
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderTitleSlot']>
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
              id="sharedUXPackages.data_cascade.demo.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
              }}
            />
          }
        />,
      ];
    }, []);

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(
      () => [
        {
          iconType: 'arrowDown',
          iconSide: 'right',
          onClick: () => {
            /** Noop click handler */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.action"
              defaultMessage="Take action"
            />
          ),
        },
      ],
      []
    );

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
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with one level of grouping table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
          />
        );
      },
      [groupByFields]
    );

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
            onCascadeGroupingChange={onCascadeGroupingChange}
          >
            <DataCascadeRow
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
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
    },
    size: {
      name: 'Size',
      control: 'radio',
      options: ['s', 'm', 'l'],
      description: 'Size of the cascade rows',
    },
  },
  args: {
    query:
      'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) by customer_full_name, purchase_date , order_value ',
    size: 'm',
  },
};

CascadeCustomHeaderImplementation.parameters = { docs: { disable: true } };

/**
 * This story demonstrates how multiple stats per row can be shown in the row header.
 */
export const CascadeMultipleStatsPerRow: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Show casing multiple stats per row',
  render: function DataCascadeWrapper(args) {
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
                : /purchase_date/.test(field)
                ? faker.date.past({ years: 2 }).toLocaleDateString()
                : /order_value/.test(field)
                ? faker.commerce.price({ min: 100, max: 10000, symbol: '$' })
                : faker.person.fullName(),
          };
        }, {} as Record<string, string>);
      },
      [groupByFields]
    );

    const initData: MockGroupData[] = new Array(100).fill(null).map(() => {
      return {
        id: faker.string.uuid(),
        count: faker.number.int({ min: 1, max: 100 }),
        ...generateGroupFieldRecord(),
      };
    });

    const customTableHeader = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['customTableHeader']>
    >(
      ({ currentSelectedColumns, availableColumns, onGroupSelection }) => (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="database" size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiText>
                  <h2>Customer Orders Overview</h2>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <strong>Group by:</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  legend="select columns"
                  idSelected={currentSelectedColumns[0]}
                  options={availableColumns.map((col) => ({ id: col, label: col }))}
                  onChange={(id) => {
                    onGroupSelection([id]);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      []
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
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderTitleSlot']>
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
              id="sharedUXPackages.data_cascade.demo.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
              }}
            />
          }
        />,
        <EuiStat
          title="2,000"
          textAlign="left"
          titleColor="accent"
          description={
            <EuiTextColor color="accent">
              <span>
                <EuiIcon type="clock" color="accent" /> 70,29%
              </span>
            </EuiTextColor>
          }
        >
          Pending widget
        </EuiStat>,
        <EuiStat title="1,554" textAlign="left" titleColor="danger" description="Good news">
          <EuiTextColor color="accent">
            <span>
              <EuiIcon type="error" color="danger" /> 66,55%
            </span>
          </EuiTextColor>
        </EuiStat>,
        <EuiStat
          title="22,550"
          textAlign="left"
          titleColor="success"
          description={
            <EuiTextColor color="success">
              <span>
                <EuiIcon type="check" color="success" /> 88,88%
              </span>
            </EuiTextColor>
          }
        >
          Success widget
        </EuiStat>,
        <EuiStat title="8,888" description="Great news" textAlign="left">
          <EuiTextColor color="success">
            <span>
              <EuiIcon type="sortUp" /> 27,83%
            </span>
          </EuiTextColor>
        </EuiStat>,
      ];
    }, []);

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(
      () => [
        {
          iconType: 'arrowDown',
          iconSide: 'right',
          onClick: () => {
            /** Noop click handler */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.action"
              defaultMessage="Take action"
            />
          ),
        },
      ],
      []
    );

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
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with one level of grouping table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
          />
        );
      },
      [groupByFields]
    );

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
            onCascadeGroupingChange={onCascadeGroupingChange}
          >
            <DataCascadeRow
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
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
    },
    size: {
      name: 'Size',
      control: 'radio',
      options: ['s', 'm', 'l'],
      description: 'Size of the cascade rows',
    },
  },
  args: {
    query:
      'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) by customer_full_name, purchase_date , order_value ',
    size: 'm',
  },
};

CascadeMultipleStatsPerRow.parameters = { docs: { disable: true } };

/**
 * This story demonstrates a custom header with custom row actions,
 */
export const CascadeCustomHeaderWithCustomRowActionsImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Custom header with custom row actions',
  render: function DataCascadeWrapper(args) {
    const groupByFields = useMemo(
      () => getESQLStatsQueryMeta(args.query).groupByFields.map(({ field }) => field),
      [args.query]
    );

    const customerEmailPopoverRef = React.useRef<HTMLElement | null>(null);
    const [alertsCandidates, setAlertsCandidates] = React.useState<string[]>([]);

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
        new Array(100).fill(null).map(() => {
          return {
            id: faker.string.uuid(),
            count: faker.number.int({ min: 1, max: 100 }),
            customer_email: faker.internet.email(),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const customTableHeader = useCustomTableHeader({
      headerTitle: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="securitySignal" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText>
              <h2>Security alerts</h2>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    });

    const rowHeaderTitleSlot = useRowHeaderTitleSlot();

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
              id="sharedUXPackages.data_cascade.demo.row.count"
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
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with custom row actions table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
          />
        );
      },
      [groupByFields]
    );

    const renderSendAlertsPopover = useCallback(() => {
      return Boolean(alertsCandidates?.length) ? (
        <EuiWrappingPopover
          button={customerEmailPopoverRef.current!}
          isOpen={alertsCandidates.length > 0}
          closePopover={() => setAlertsCandidates([])}
        >
          <EuiText>
            <h3>Create an alert for {alertsCandidates.length} recipients</h3>
            <ul>
              {alertsCandidates.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </EuiText>
        </EuiWrappingPopover>
      ) : null;
    }, [alertsCandidates]);

    const sendAlertsActionClickHandler = useCallback(function (
      this: string,
      e: React.MouseEvent<Element>
    ) {
      customerEmailPopoverRef.current = e.currentTarget as HTMLElement;
      setAlertsCandidates([this]);
    },
    []);

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(
      ({ rowData, nodePath }) => {
        const rowGroup = nodePath[nodePath.length - 1];

        const groupValue = rowData[rowGroup];

        return [
          {
            iconType: 'bell',
            'aria-label': `Create alert for ${groupValue}`,
            onClick: sendAlertsActionClickHandler.bind(String(groupValue)),
            label: (
              <FormattedMessage
                id="sharedUXPackages.data_cascade.demo.row.edit"
                defaultMessage="Create alert"
              />
            ),
          },
        ];
      },
      [sendAlertsActionClickHandler]
    );

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <Fragment>{renderSendAlertsPopover()}</Fragment>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
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
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
    },
    size: {
      name: 'Size',
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

CascadeCustomHeaderWithCustomRowActionsImplementation.parameters = { docs: { disable: true } };

/**
 * This story demonstrates a custom header with hidden row actions,
 */
export const CascadeCustomHeaderWithHiddenRowActions: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Custom header with hidden row actions',
  render: function DataCascadeWrapper(args) {
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
        new Array(100).fill(null).map(() => {
          return {
            id: faker.string.uuid(),
            count: faker.number.int({ min: 1, max: 100 }),
            customer_email: faker.internet.email(),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const customTableHeader = useCustomTableHeader({
      headerTitle: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="securitySignal" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText>
              <h2>Security alerts</h2>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    });

    const rowHeaderTitleSlot = useRowHeaderTitleSlot();

    const onCascadeGroupingChange = useCallback<
      NonNullable<DataCascadeProps<MockGroupData, LeafNode>['onCascadeGroupingChange']>
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
              id="sharedUXPackages.data_cascade.demo.row.count"
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
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with hidden row actions table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
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
          iconType: 'starEmpty',
          'aria-label': `favorite ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for favorite */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.favorite"
              defaultMessage="Favorite"
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
              id="sharedUXPackages.data_cascade.demo.row.flag"
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
              id="sharedUXPackages.data_cascade.demo.row.create_alerts"
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
              id="sharedUXPackages.data_cascade.demo.row.download"
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
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
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
      description:
        'Simulation of The ES|QL query that the user provided into the esql editor, used to generate group by fields used to generate group by fields used to generate group by fields',
    },
    size: {
      name: 'Size',
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

CascadeCustomHeaderWithHiddenRowActions.parameters = { docs: { disable: true } };

/**
 * This story demonstrates a custom header with row selection action enabled,
 * this is useful for scenarios where one might want to select rows in the cascade component
 * and perform actions on the selected rows.
 */
export const CascadeCustomHeaderWithRowSelectionActionEnabled: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Custom header with row selection action enabled',
  render: function DataCascadeWrapper(args) {
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
        new Array(100).fill(null).map(() => {
          return {
            id: faker.string.uuid(),
            count: faker.number.int({ min: 1, max: 100 }),
            customer_email: faker.internet.email(),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const customTableHeader = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['customTableHeader']>
    >(({ currentSelectedColumns, availableColumns, onGroupSelection, selectedRows }) => {
      return (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="securitySignal" size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiText>
                  <h2>Security alerts</h2>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
              {selectedRows.length > 0 && (
                <EuiFlexItem alignItems="center" gutterSize="s">
                  <EuiFilterGroup>
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => {
                        // Handle filter button click
                      }}
                      badgeColor="success"
                      hasActiveFilters={true}
                      numFilters={selectedRows.length}
                    >
                      Selected
                    </EuiFilterButton>
                  </EuiFilterGroup>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <strong>Group by:</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  legend="select columns"
                  idSelected={currentSelectedColumns[0]}
                  options={availableColumns.map((col) => ({ id: col, label: col }))}
                  onChange={(id) => {
                    onGroupSelection([id]);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, []);

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
              id="sharedUXPackages.data_cascade.demo.row.count"
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
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with row selection action enabled table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
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
              id="sharedUXPackages.data_cascade.demo.row.investigate"
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
              id="sharedUXPackages.data_cascade.demo.row.flag"
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
              id="sharedUXPackages.data_cascade.demo.row.create_alerts"
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
              id="sharedUXPackages.data_cascade.demo.row.download"
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
              <h1>Data Cascade</h1>
              <p>ES|QL Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
            onCascadeGroupingChange={onCascadeGroupingChange}
            enableRowSelection
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

CascadeCustomHeaderWithRowSelectionActionEnabled.parameters = { docs: { disable: true } };
