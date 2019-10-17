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
import { DiscoverFieldSearch, Props } from './discover_field_search';

describe('DiscoverFieldSearch', () => {
  const defaultProps = {
    onChange: jest.fn(),
    value: 'test',
    types: ['number', 'string', '_source'],
  };

  function mountComponent(props?: Props) {
    const compProps = props || defaultProps;
    const comp = mountWithIntl(<DiscoverFieldSearch {...compProps} />);
    return comp;
  }

  test('enter value', () => {
    const component = mountComponent();
    const input = findTestSubject(component, 'fieldFilterSearchInput');
    input.simulate('change', { target: { value: 'new filter' } });
    expect(defaultProps.onChange).toBeCalledTimes(1);
  });

  test('change in active filters should change facet selection', () => {
    const component = mountComponent();
    let btn = findTestSubject(component, 'toggleFieldFilterButton');
    expect(btn.hasClass('euiFacetButton--isSelected')).toBeFalsy();
    btn.simulate('click');
    const aggregatableSelector = findTestSubject(component, 'aggregatableSelect');
    aggregatableSelector.simulate('change', { target: { value: 'true' } });
    btn = findTestSubject(component, 'toggleFieldFilterButton');
    expect(btn.hasClass('euiFacetButton--isSelected')).toBe(true);
  });

  test('change in active filters should change filters count', () => {
    const component = mountComponent();
    let btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    btn = findTestSubject(component, 'toggleFieldFilterButton');
    const badge = btn.find('.euiNotificationBadge');
    // no active filters
    expect(badge.text()).toEqual('0');
    // change value of aggregatable select
    const aggregatableSelector = findTestSubject(component, 'aggregatableSelect');
    aggregatableSelector.simulate('change', { target: { value: 'true' } });
    expect(badge.text()).toEqual('1');
    // change value of searchable select
    const searchableSelect = findTestSubject(component, 'searchableSelect');
    searchableSelect.simulate('change', { target: { value: 'false' } });
    expect(badge.text()).toEqual('2');
    // change value of searchable select
    searchableSelect.simulate('change', { target: { value: 'any' } });
    expect(badge.text()).toEqual('1');
  });

  test('change in missing fields switch should not change filter count', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const badge = btn.find('.euiNotificationBadge');
    expect(badge.text()).toEqual('0');
    const missingSwitch = findTestSubject(component, 'missingSwitch');
    missingSwitch.simulate('change', { target: { value: false } });
    expect(badge.text()).toEqual('0');
  });

  test('change in filters triggers onChange', () => {
    const onChange = jest.fn();
    const component = mountComponent({ ...defaultProps, ...{ onChange } });
    const btn = findTestSubject(component, 'toggleFieldFilterButton');
    btn.simulate('click');
    const aggregatableSelector = findTestSubject(component, 'aggregatableSelect');
    const missingSwitch = findTestSubject(component, 'missingSwitch');
    aggregatableSelector.simulate('change', { target: { value: 'true' } });
    missingSwitch.simulate('change', { target: { value: false } });
    expect(onChange).toBeCalledTimes(2);
  });
});
