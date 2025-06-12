/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { StoryObj, Meta } from '@storybook/react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { DataCascade } from '..';

/**
 * @description story for dropdown component which allows selecting options based of provided ES|QL query',
 */
export default {
  title: 'Data Cascade/Data Cascade',
} satisfies Meta;

export const GridImplementation: StoryObj<{ query: string }> = {
  render: function DataCascadeWrapper(args) {
    const initData = new Array(100).fill(null).map(() => {
      return {
        id: faker.string.uuid(),
        group: faker.person.fullName(),
        count: faker.number.int({ min: 1, max: 100 }),
      };
    });

    return (
      <EuiFlexGroup direction="column" css={{ height: '70vh' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h1>ESQL Data Cascade</h1>
              <p>Query: {args.query}</p>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            data={initData}
            query={args.query}
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
                <h2>{row.original.group ?? row.original.customer_full_name}</h2>
              </EuiText>
            )}
            rowHeaderMetaSlots={({ row }) => [
              <EuiText textAlign="right">
                <p>
                  Count: <EuiBadge color="hollow">{row.original.count}</EuiBadge>
                </p>
              </EuiText>,
            ]}
            rowContentSlot={({ row }) => (
              <EuiFlexItem>{JSON.stringify(row.original, null, 2)}</EuiFlexItem>
            )}
            onGroupByChange={(groupBy) => {
              // eslint-disable-next-line no-console -- Handle group by change if needed
              console.log('Group By Changed:', groupBy);
            }}
            onGroupByRowExpanded={async ({ row, state }) => {
              // Simulate a data fetch on row expansion
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(
                    new Array(row.original.count).fill(null).map(() => {
                      return {
                        id: faker.string.uuid(),
                        ...state.groupByColumns?.reduce((acc, cur) => {
                          if (cur === state.currentGroupByColumn) {
                            acc[cur] = row.original.group;
                          } else {
                            acc[cur] = faker.lorem.word();
                          }
                          return acc;
                        }, {} as Record<string, string>),
                        details: faker.lorem.sentence(),
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
  },
  args: {
    query:
      'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) by customer_full_name, customer_birth_date , customer_first_name ',
  },
};
