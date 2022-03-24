/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MetricVisValue } from './metric_value';
import { MetricOptions, MetricStyle, VisParams } from '../../common/types';
import { LabelPosition } from '../../common/constants';

const baseMetric: MetricOptions = { label: 'Foo', value: 'foo', lightText: false };
const font: MetricStyle = {
  spec: { fontSize: '12px' },

  /* stylelint-disable */
  type: 'style',
  css: '',
  bgColor: false,
  labelColor: false,
  /* stylelint-enable */
};

const labelConfig: VisParams['metric']['labels'] = {
  show: true,
  position: LabelPosition.BOTTOM,
  style: { spec: {}, type: 'style', css: '' },
};

describe('MetricVisValue', () => {
  it('should be wrapped in button if having a click listener', () => {
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        onFilter={() => {}}
        colorFullBackground={false}
        labelConfig={labelConfig}
      />
    );
    expect(component.find('button').exists()).toBe(true);
  });

  it('should not be wrapped in button without having a click listener', () => {
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        colorFullBackground={false}
        labelConfig={labelConfig}
      />
    );
    expect(component.find('button').exists()).toBe(false);
  });

  it('should add -isfilterable class if onFilter is provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        onFilter={onFilter}
        colorFullBackground={false}
        labelConfig={labelConfig}
      />
    );
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(1);
  });

  it('should not add -isfilterable class if onFilter is not provided', () => {
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        colorFullBackground={false}
        labelConfig={labelConfig}
      />
    );
    component.simulate('click');
    expect(component.find('.mtrVis__container-isfilterable')).toHaveLength(0);
  });

  it('should call onFilter callback if provided', () => {
    const onFilter = jest.fn();
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        onFilter={onFilter}
        colorFullBackground={false}
        labelConfig={labelConfig}
      />
    );
    component.simulate('click');
    expect(onFilter).toHaveBeenCalled();
  });

  it('should add correct class name if colorFullBackground is true', () => {
    const component = shallow(
      <MetricVisValue
        style={font}
        metric={baseMetric}
        onFilter={() => {}}
        colorFullBackground={true}
        labelConfig={labelConfig}
      />
    );
    expect(component.find('.mtrVis__container-isfull').exists()).toBe(true);
  });
});
