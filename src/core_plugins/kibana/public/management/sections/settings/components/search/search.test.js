/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';


import { Query } from '@elastic/eui';
import { Search } from './search';

const query = Query.parse('');
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];

describe('Search', () => {
  it('should render normally', async () => {
    const onQueryChange = () => {};
    const component = shallowWithIntl(
      <Search.WrappedComponent
        query={query}
        categories={categories}
        onQueryChange={onQueryChange}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should call parent function when query is changed', async () => {
    //This test is brittle as it knows about implementation details
    // (EuiFieldSearch uses onKeyup instead of onChange to handle input)
    const onQueryChange = jest.fn();
    const component = mountWithIntl(
      <Search.WrappedComponent
        query={query}
        categories={categories}
        onQueryChange={onQueryChange}
      />
    );
    component.find('input').simulate('keyup', { target: { value: 'new filter' } });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });
});
