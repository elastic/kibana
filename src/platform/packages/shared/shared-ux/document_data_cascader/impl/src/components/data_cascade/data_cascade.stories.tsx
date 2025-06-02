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
import { EuiText } from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { DataCascadeProvider, useDataCascadeDispatch, useDataCascadeState } from '../../lib';
import { DataCascade } from '..';

/**
 * @description story for dropdown component which allows selecting options based of provided ES|QL query',
 */
export default {
  title: 'Data Cascade/Data Cascade',
} satisfies Meta;

export const GridImplementation: StoryObj<{ query: string }> = {
  render: (args) => {
    return (
      <DataCascadeProvider query={args.query}>
        {React.createElement(function DataCascadeWrapper() {
          const state = useDataCascadeState();
          const dispatch = useDataCascadeDispatch();

          React.useEffect(() => {
            dispatch({
              type: 'SET_INITIAL_STATE',
              payload: new Array(100).fill(null).map(() => ({
                customer_full_name: faker.person.fullName(),
                customer_birth_date: faker.date.birthdate().toISOString(),
                customer_first_name: faker.person.firstName(),
                count: faker.number.int({ min: 1, max: 100 }),
              })),
            });
          }, [dispatch]);

          return (
            <React.Fragment>
              {/* <EuiText>
                <div>
                  <h1>ESQL Data Pooler</h1>
                  <p>Query: {data.currentQueryString}</p>
                </div>
              </EuiText> */}
              <DataCascade
                data={state.data}
                groupByColumns={state.groupByColumns}
                currentGroupByColumn={state.currentGroupByColumn}
                onGroupByChange={(groupBy) => {
                  // Handle group by change if needed
                  console.log('Group By Changed:', groupBy);
                }}
              />
            </React.Fragment>
          );
        })}
      </DataCascadeProvider>
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
