/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { FC } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import type { FilterBadgeProps } from '../filter_badge';
import { FilterBadge } from '../filter_badge';
import { getFilterMockOrConditional } from '../__mock__/filters';

export default {
  title: 'Filters badge',
  component: FilterBadge,
};

const Template: ComponentStory<FC<FilterBadgeProps>> = (args) => <FilterBadge {...args} />;

export const Default = Template.bind({});

const mockedDataView = {
  id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
  title: 'logstash-*',
  fields: [
    {
      name: 'category.keyword',
      type: 'string',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
  getFormatterForField: () => ({
    convert: (name: string) => name,
  }),
} as unknown as DataView;

Default.args = {
  filters: getFilterMockOrConditional(),
  dataView: mockedDataView,
};
