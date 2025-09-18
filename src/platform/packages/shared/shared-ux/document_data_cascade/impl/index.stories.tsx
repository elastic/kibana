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
  type HorizontalAlignment,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type LeafNode,
  type DataCascadeRowCellProps,
} from '.';
import type { MockGroupData } from './src/__fixtures__/types';
import { getESQLStatsQueryMeta } from './src/lib/parse_esql';

/**
 * @description story for data document cascade component which allows rendering of data in a quasi tree structure',
 * this story emulates ES|QL scenario of doing stats on a dataset to show the data grouped by some fields.
 */
export default {
  title: 'Data Cascade/Configuration Examples',
} satisfies Meta;

export const CascadeNestedGridImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Data Cascade - Nested Groups with Default Header',
  render: function DataCascadeWrapper(args) {
    const { groupByFields } = getESQLStatsQueryMeta(args.query);

    const generateGroupFieldRecord = (
      nodePath?: string[],
      nodePathMap?: Record<string, string>
    ) => {
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
    };

    const initData: MockGroupData[] = new Array(100).fill(null).map(() => {
      return {
        id: faker.string.uuid(),
        count: faker.number.int({ min: 1, max: 100 }),
        ...generateGroupFieldRecord(),
      };
    });

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
            tableTitleSlot={({ rows }) => (
              <EuiText>
                {i18n.translate('sharedUXPackages.data_cascade.toolbar.query_string', {
                  defaultMessage: '{entitiesCount} {entitiesAlias} | {groupCount} groups',
                  values: {
                    entitiesCount: rows.reduce((acc, row) => acc + row.count, 0),
                    groupCount: rows.length,
                    entitiesAlias: 'documents',
                  },
                })}
              </EuiText>
            )}
            onCascadeGroupingChange={(groupBy) => {
              // eslint-disable-next-line no-console -- Handle group by change if needed
              console.log('Group By Changed:', groupBy);
            }}
          >
            <DataCascadeRow
              onCascadeGroupNodeExpanded={async ({ row, nodePath, nodePathMap }) => {
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
              }}
              rowHeaderTitleSlot={({ rowData, nodePath }) => {
                const rowGroup = nodePath[nodePath.length - 1];

                return (
                  <EuiText>
                    <h2>{rowData[rowGroup]}</h2>
                  </EuiText>
                );
              }}
              rowHeaderMetaSlots={({ rowData, nodePath }) => {
                const rowGroup = nodePath[nodePath.length - 1];
                const baseSlotDef: React.ReactNode[] = [];

                // Only show the count stat on the last grouping level
                return rowData.depth === groupByFields.length - 1
                  ? [
                      <EuiStat
                        title={rowData.count}
                        textAlign="right"
                        description={
                          <FormattedMessage
                            id="sharedUXPackages.data_cascade.demo.row.count"
                            defaultMessage="<indicator>{identifier} record count</indicator>"
                            values={{
                              identifier: rowData[rowGroup].replace(/_/g, ' '),
                              indicator: (chunks) => (
                                <EuiHealth color="subdued">{chunks}</EuiHealth>
                              ),
                            }}
                          />
                        }
                      />,
                      ...baseSlotDef,
                    ]
                  : baseSlotDef;
              }}
              rowHeaderActions={() => [
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
              ]}
            >
              <DataCascadeRowCell
                onCascadeLeafNodeExpanded={async ({ row, nodePathMap, nodePath }) => {
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
                }}
              >
                {({ data }) => {
                  return (
                    <EuiBasicTable
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
                }}
              </DataCascadeRowCell>
            </DataCascadeRow>
          </DataCascade>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  argTypes: {
    query: {
      name: 'ES|QL Editor Query',
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

export const CascadeCustomHeaderImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Data Cascade - Custom header with one level of grouping',
  render: function DataCascadeWrapper(args) {
    const { groupByFields } = getESQLStatsQueryMeta(args.query);

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
      ({ currentSelectedColumns, availableColumns, onSelectionChange }) => (
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
                    onSelectionChange([id]);
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
      ComponentProps<typeof DataCascadeRow<MockGroupData>>['onCascadeGroupNodeExpanded']
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
      NonNullable<ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderTitleSlot']>
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];
      return (
        <EuiText>
          <h2>{rowData[rowGroup]}</h2>
        </EuiText>
      );
    }, []);

    const rowHeaderMetaSlots = useCallback<
      NonNullable<ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderMetaSlots']>
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];
      const groupValue = rowData[rowGroup];
      return [
        <EuiStat
          title={rowData.count}
          textAlign="right"
          description={
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                identifier: String(groupValue).replace(/_/g, ' '),
                indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
              }}
            />
          }
        />,
      ];
    }, []);

    const rowHeaderActions = useCallback<
      NonNullable<ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderActions']>
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
      name: 'ES|QL Editor Query',
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

export const CascadeCustomHeaderWithCustomRowActionsImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  name: 'Data Cascade - Custom header with custom Row Actions',
  render: function DataCascadeWrapper(args) {
    const { groupByFields } = useMemo(() => getESQLStatsQueryMeta(args.query), [args.query]);
    const customerEmailPopoverRef = React.useRef<HTMLButtonElement | null>(null);
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

    const customTableHeader = useCallback<
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['customTableHeader']>
    >(
      ({ currentSelectedColumns, availableColumns, onSelectionChange }) => (
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
                    onSelectionChange([id]);
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
      ComponentProps<typeof DataCascadeRow<MockGroupData>>['onCascadeGroupNodeExpanded']
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
      ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderTitleSlot']
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      return (
        <EuiText>
          <h2>{rowData[rowGroup]}</h2>
        </EuiText>
      );
    }, []);

    const rowHeaderMetaSlots = useCallback<
      NonNullable<ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderMetaSlots']>
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      return [
        <EuiStat
          title={rowData.count}
          textAlign="right"
          description={
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                identifier: rowGroup.replace(/_/g, ' '),
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
      e: React.MouseEvent<HTMLButtonElement>
    ) {
      customerEmailPopoverRef.current = e.currentTarget;
      setAlertsCandidates([this]);
    },
    []);

    const rowHeaderActions = useCallback<
      NonNullable<ComponentProps<typeof DataCascadeRow<MockGroupData>>['rowHeaderActions']>
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
            <DataCascadeRow<MockGroupData>
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
      name: 'ES|QL Editor Query',
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
