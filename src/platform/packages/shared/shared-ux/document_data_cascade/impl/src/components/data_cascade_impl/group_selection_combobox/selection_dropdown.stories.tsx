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
import { SelectionDropdown } from './selection_dropdown';
import { DataCascadeProvider } from '../../../store_provider';
import { getESQLStatsQueryMeta } from '../../../lib';

/**
 * @description story for dropdown component which allows selecting options based of provided ES|QL query',
 */
export default {
  title: 'Data Cascade/Selection Dropdown',
} satisfies Meta;

export const ValidQueryScenario: StoryObj<{ query: string }> = {
  render: (args) => {
    return (
      <DataCascadeProvider cascadeGroups={getESQLStatsQueryMeta(args.query).groupByFields}>
        <SelectionDropdown />
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
