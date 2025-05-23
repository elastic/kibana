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
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { DataPoolerProvider } from '../lib/store';
import { SelectionDropdown } from './selection_dropdown';

/**
 * @description story for dropdown component which allows selecting options based of provided ES|QL query',
 */
export default {
  title: 'Data Pooler/Selection Dropdown',
} satisfies Meta;

type SelectionDropdownProps = ComponentProps<typeof SelectionDropdown>;
type SelectionDropdownServiceArguments = Record<string, unknown>;
type Arguments = SelectionDropdownProps & SelectionDropdownServiceArguments;

class SelectionDropdownStorybookMock extends AbstractStorybookMock<
  SelectionDropdownProps,
  SelectionDropdownServiceArguments,
  SelectionDropdownProps,
  SelectionDropdownServiceArguments
> {
  propArguments = {
    query: {
      name: 'ES|QL Editor Query',
      type: 'string' as const,
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
    },
  };
  serviceArguments = {};
  dependencies = [];

  getProps(params?: Arguments): SelectionDropdownProps {
    return {
      ...this.getArgumentValue('props', params),
    };
  }

  getServices(params?: Arguments): SelectionDropdownServiceArguments {
    return {};
  }
}

const selectionDropdownStorybookMock = new SelectionDropdownStorybookMock();
const argTypes = selectionDropdownStorybookMock.getArgumentTypes();

export const ValidQueryScenario: StoryObj<Arguments> = {
  render: (args) => {
    return (
      <DataPoolerProvider query={args.query}>
        <SelectionDropdown />
      </DataPoolerProvider>
    );
  },
  argTypes,
  args: {
    query:
      'FROM kibana_sample_data_ecommerce | STATS count = COUNT(*) by customer_full_name, customer_birth_date , customer_first_name ',
  },
};
