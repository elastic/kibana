/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { IAggConfig } from '@kbn/data-plugin/public';
import { DEFAULT_OPTIONS, aggFilter, MetricAggParamEditor } from './metric_agg';

jest.mock('./utils', () => ({
  useAvailableOptions: jest.fn((aggFilterArray, filteredMetrics, defaultOptions) => [
    ...filteredMetrics.map(({ id, type }: { id: string; type: { name: string } }) => ({
      text: type.name,
      value: id,
    })),
    ...defaultOptions,
  ]),
  useFallbackMetric: jest.fn(),
  useValidation: jest.fn(),
}));

import { useAvailableOptions, useFallbackMetric, useValidation } from './utils';
import { AggParamEditorProps } from '../agg_param_props';

const agg = {
  id: '1',
  type: { name: 'cumulative_sum' },
  makeLabel() {
    return 'cumulative_sum';
  },
} as IAggConfig;

const metricAggs = [
  agg,
  {
    id: '2',
    type: { name: 'count' },
    makeLabel() {
      return 'count';
    },
  },
  {
    id: '3',
    type: { name: 'avg' },
    makeLabel() {
      return 'avg';
    },
  },
  {
    id: '4',
    type: { name: 'max' },
    makeLabel() {
      return 'max';
    },
  },
] as IAggConfig[];

describe('MetricAggParamEditor', () => {
  let defaultProps: Partial<AggParamEditorProps<string>>;

  beforeEach(() => {
    defaultProps = {
      agg,
      showValidation: false,
      setValue: jest.fn(),
      setValidity: jest.fn(),
    };
  });

  test('should be rendered with default set of props', () => {
    const comp = shallow(
      <MetricAggParamEditor {...(defaultProps as AggParamEditorProps<string>)} />
    );

    expect(comp).toMatchSnapshot();
  });

  test('should call custom hooks', () => {
    shallow(
      <MetricAggParamEditor {...(defaultProps as AggParamEditorProps<string>)} value="custom" />
    );

    expect(useFallbackMetric).toHaveBeenCalledWith(defaultProps.setValue, aggFilter, [], 'custom');
    expect(useValidation).toHaveBeenCalledWith(defaultProps.setValidity, true);
    expect(useAvailableOptions).toHaveBeenCalledWith(aggFilter, [], DEFAULT_OPTIONS);
  });

  test('should filter self aggregation from available options', () => {
    const comp = shallow(
      <MetricAggParamEditor
        {...(defaultProps as AggParamEditorProps<string>)}
        value="custom"
        metricAggs={[agg]}
      />
    );

    expect(comp.find('EuiSelect').props()).toHaveProperty('options', [...DEFAULT_OPTIONS]);
    expect(useFallbackMetric).toHaveBeenCalledWith(
      defaultProps.setValue,
      aggFilter,
      [agg],
      'custom'
    );
  });

  test('should be valid/invalid if value is defined/undefined', () => {
    const comp = mount(
      <MetricAggParamEditor {...(defaultProps as AggParamEditorProps<string>)} value="custom" />
    );

    expect(comp.children().props()).toHaveProperty('isInvalid', false);
    expect(useValidation).lastCalledWith(defaultProps.setValidity, true);

    comp.setProps({ value: undefined, showValidation: true });

    expect(comp.children().props()).toHaveProperty('isInvalid', true);
    expect(useValidation).lastCalledWith(defaultProps.setValidity, false);
  });

  test('should set new value into the model on change', () => {
    const comp = mount(
      <MetricAggParamEditor
        {...(defaultProps as AggParamEditorProps<string>)}
        value="custom"
        metricAggs={metricAggs}
      />
    );

    comp.find('select').simulate('change', { target: { value: '2' } });
    expect(defaultProps.setValue).lastCalledWith('2');
  });
});
