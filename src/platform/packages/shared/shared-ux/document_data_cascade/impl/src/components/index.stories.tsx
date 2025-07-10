/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { StoryObj, Meta } from '@storybook/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiHealth,
  HorizontalAlignment,
  EuiStat,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { DataCascade } from '.';
import { getESQLStatsQueryMeta } from '../lib/parse_esql';

/**
 * @description story for data document cascade component which allows rendering of data in a quasi tree structure',
 * this story emulates ES|QL scenario of doing stats on a dataset to show the data grouped by some fields.
 */
export default {
  title: 'Data Cascade/Data Cascade',
} satisfies Meta;

export const CascadeGridImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  render: function DataCascadeWrapper(args) {
    const { groupByFields } = getESQLStatsQueryMeta(args.query);

    interface MockGroupData {
      [index: string]: string | number;
      id: string;
      count: number;
    }

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
                    entitiesCount: rows.reduce((acc, row) => acc + row.original.count, 0),
                    groupCount: rows.length,
                    entitiesAlias: 'documents',
                  },
                })}
              </EuiText>
            )}
            rowHeaderTitleSlot={({ row }) => (
              <EuiText>
                <h2>{row.original[groupByFields[row.depth]]}</h2>
              </EuiText>
            )}
            rowHeaderMetaSlots={({ row }) => {
              const baseSlotDef: React.ReactNode[] = [
                <EuiButtonEmpty iconSide="right" iconType="arrowDown" flush="right">
                  <FormattedMessage
                    id="sharedUXPackages.data_cascade.demo.row.action"
                    defaultMessage="Take Action"
                  />
                </EuiButtonEmpty>,
              ];

              return row.depth === groupByFields.length - 1
                ? [
                    <EuiStat
                      title={row.original.count}
                      textAlign="right"
                      description={
                        <FormattedMessage
                          id="sharedUXPackages.data_cascade.demo.row.count"
                          defaultMessage="<indicator>{identifier} record count</indicator>"
                          values={{
                            identifier: groupByFields[row.depth].replace(/_/g, ' '),
                            indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
                          }}
                        />
                      }
                    />,
                    ...baseSlotDef,
                  ]
                : baseSlotDef;
            }}
            leafContentSlot={({ data }) => {
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
            onCascadeGroupingChange={(groupBy) => {
              // eslint-disable-next-line no-console -- Handle group by change if needed
              console.log('Group By Changed:', groupBy);
            }}
            onCascadeGroupNodeExpanded={async ({ row, nodePath, nodePathMap }) => {
              // Simulate a data fetch on row expansion
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(
                    new Array(row.original.count).fill(null).map(() => {
                      return {
                        id: faker.string.uuid(),
                        count: faker.number.int({ min: 1, max: row.original.count }),
                        ...generateGroupFieldRecord(nodePath, nodePathMap),
                      };
                    })
                  );
                }, 3000);
              });
            }}
            onCascadeLeafNodeExpanded={async ({ row, nodePathMap, nodePath }) => {
              // Simulate a data fetch for the expanded leaf, ideally we'd want to use nodePath information to fetch this data
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(
                    new Array(row.original.count).fill(null).map(() => {
                      return {
                        id: faker.string.uuid(),
                        ...generateGroupFieldRecord(nodePath, nodePathMap),
                      };
                    })
                  );
                }, 3000);
              });
            }}
          />
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
