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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { DiscoverFieldSearch } from './discover_field_search';

describe('DiscoverFieldSearch', () => {
  const props = {
    onChange: jest.fn(),
    value: 'test',
    types: ['number', 'string', '_source'],
  };

  test('enter value', () => {
    const component = mountWithIntl(<DiscoverFieldSearch {...props} />);
    const input = findTestSubject(component, 'fieldFilterSearchInput');
    input.simulate('change', { target: { value: 'new filter' } });
    expect(props.onChange).toBeCalledTimes(1);
  });

  test('change in active filters should change facet selection', () => {
    const component = mountWithIntl(<DiscoverFieldSearch {...props} />);
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    expect(btn.hasClass('euiFacetButton--isSelected')).toBeFalsy();
    const aggregatableSelector = findTestSubject(component, 'aggregatableSelect');
    aggregatableSelector.simulate('change', { target: { value: 'yes'} });
    expect(btn.hasClass('euiFacetButton--isSelected')).toBe(true);
  });
});
