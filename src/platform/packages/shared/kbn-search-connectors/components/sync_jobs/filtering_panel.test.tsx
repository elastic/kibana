/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { shallow } from 'enzyme';

import { FilteringRule } from '../..';

import { FilteringPanel } from './filtering_panel';

describe('FilteringPanel', () => {
  const filteringRules = [
    {
      order: 1,
      policy: 'exclude',
      rule: 'contains',
      value: 'THIS VALUE',
    },
    {
      order: 2,
      policy: 'exclude',
      rule: 'ends_with',
      value: 'THIS VALUE',
    },
    {
      order: 0,
      policy: 'include',
      rule: 'equals',
      value: 'THIS VALUE',
    },
    {
      order: 5,
      policy: 'include',
      rule: '>',
      value: 'THIS VALUE',
    },
    {
      order: 4,
      policy: 'exclude',
      rule: '<',
      value: 'THIS VALUE',
    },
  ] as FilteringRule[];

  it('renders', () => {
    const wrapper = shallow(<FilteringPanel filteringRules={[]} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders filtering rules list', () => {
    const wrapper = shallow(<FilteringPanel filteringRules={filteringRules} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders advanced snippet', () => {
    const wrapper = shallow(
      <FilteringPanel
        advancedSnippet={{
          created_at: 'whatever',
          updated_at: 'sometime',
          value: { one: 'two', three: 'four' },
        }}
        filteringRules={filteringRules}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
