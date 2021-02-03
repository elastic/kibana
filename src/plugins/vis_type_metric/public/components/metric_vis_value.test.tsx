/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MetricVisValue } from './metric_vis_value';

const baseMetric = { label: 'Foo', value: 'foo' } as any;

describe('MetricVisValue', () => {
  it('should be wrapped in EuiKeyboardAccessible if having a click listener', () => {
    const component = shallow(
      <MetricVisValue fontSize={12} metric={baseMetric} onFilter={() => {}} />
    );
    expect(component.find('EuiKeyboardAccessible').exists()).toBe(true);
  });

  it('should not be wrapped in EuiKeyboardAccessible without having a click listener', () => {
    const component = shallow(<MetricVisValue fontSize={12} metric={baseMetric} />);
    expect(component.find('EuiKeyboardAccessible').exists()).toBe(false);
  });

  it('should add -isfilterable class if onFilter is provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue fontSize={12} metric={baseMetric} onFilter={onFilter} />
    );
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(1);
  });

  it('should not add -isfilterable class if onFilter is not provided', () => {
    const component = shallow(<MetricVisValue fontSize={12} metric={baseMetric} />);
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(0);
  });

  it('should call onFilter callback if provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue fontSize={12} metric={baseMetric} onFilter={onFilter} />
    );
    component.find('.mtrVis__container-isfilterable').simulate('click');
    expect(onFilter).toHaveBeenCalledWith(baseMetric);
  });
});
