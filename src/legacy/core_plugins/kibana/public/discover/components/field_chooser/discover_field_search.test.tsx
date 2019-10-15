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
  function mountComponent() {
    const props = {
      onChange: jest.fn(),
      onShowFilter: jest.fn(),
      showFilter: false,
      filtersActive: 0,
      value: 'test',
    };
    const comp = mountWithIntl(<DiscoverFieldSearch {...props} />);
    const input = findTestSubject(comp, 'fieldFilterSearchInput');
    const btn = findTestSubject(comp, 'toggleFieldFilterButton');
    return { comp, input, btn, props };
  }

  test('enter value', () => {
    const { input, props } = mountComponent();
    input.simulate('change', { target: { value: 'new filter' } });
    expect(props.onChange).toBeCalledTimes(1);
  });

  // this should work, but doesn't, have to do some research
  test('click toggle filter button', () => {
    const { btn, props } = mountComponent();
    btn.simulate('click');
    expect(props.onShowFilter).toBeCalledTimes(1);
  });

  test('change showFilter value should change aria label', () => {
    const { comp } = mountComponent();
    let btn = findTestSubject(comp, 'toggleFieldFilterButton');
    expect(btn.prop('aria-label')).toEqual('Show field filter settings');
    comp.setProps({ showFilter: true });
    btn = findTestSubject(comp, 'toggleFieldFilterButton');
    expect(btn.prop('aria-label')).toEqual('Hide field filter settings');
  });

  test('change filtersActive should change facet selection', () => {
    const { comp } = mountComponent();
    let btn = findTestSubject(comp, 'toggleFieldFilterButton');
    expect(btn.hasClass('euiFacetButton--isSelected')).toBeFalsy();
    comp.setProps({ filtersActive: 3 });
    btn = findTestSubject(comp, 'toggleFieldFilterButton');
    expect(btn.hasClass('euiFacetButton--isSelected')).toBe(true);
  });
});
