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
import { shallow } from 'enzyme';

import { MetricVisValue } from './metric_vis_value';

describe('MetricVisValue', () => {
  it('should be wrapped in EuiKeyboardAccessible if having a click listener', () => {
    const component = shallow(
      <MetricVisValue fontSize={12} metric={{ label: 'Foo', value: 'foo' }} onFilter={() => {}} />
    );
    expect(component.find('EuiKeyboardAccessible').exists()).toBe(true);
  });

  it('should not be wrapped in EuiKeyboardAccessible without having a click listener', () => {
    const component = shallow(
      <MetricVisValue fontSize={12} metric={{ label: 'Foo', value: 'foo' }} />
    );
    expect(component.find('EuiKeyboardAccessible').exists()).toBe(false);
  });

  it('should add -isfilterable class if onFilter is provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue fontSize={12} metric={{ label: 'Foo', value: 'foo' }} onFilter={onFilter} />
    );
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(1);
  });

  it('should not add -isfilterable class if onFilter is not provided', () => {
    const component = shallow(
      <MetricVisValue fontSize={12} metric={{ label: 'Foo', value: 'foo' }} onFilter={null} />
    );
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(0);
  });

  it('should call onFilter callback if provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue fontSize={12} metric={{ label: 'Foo', value: 'foo' }} onFilter={onFilter} />
    );
    component.find('.mtrVis__container-isfilterable').simulate('click');
    expect(onFilter).toHaveBeenCalledWith({ label: 'Foo', value: 'foo' });
  });
});
