/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiText,
  EuiStat,
  EuiHealth,
  EuiBasicTable,
  type HorizontalAlignment,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { StoryObj } from '@storybook/react';
import React, { type ComponentProps, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MockGroupData } from '../../__fixtures__/types';
import {
  DataCascade,
  type DataCascadeProps,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
  DataCascadeRow,
  DataCascadeRowCell,
  type LeafNode,
} from '../../components';
import { useRowHeaderTitleSlot } from '../helpers';

export const CascadeNestedGridImplementation: StoryObj<
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
      ({ rowDepth, rowData }) => {
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
                    id="sharedUXPackages.data_cascade.demo.nested_groups.row.count"
                    defaultMessage="<indicator>count</indicator>"
                    values={{
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
              id="sharedUXPackages.data_cascade.demo.nested_groups.row.action"
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
              <h3>{context.name}</h3>
              <p>Data Cascade showing nested groups</p>
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
