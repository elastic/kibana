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
import { mount, shallow } from 'enzyme';

import { MetricAggParamEditor } from './metric_agg';
import { AggParamEditorProps } from '..';
import { AggConfig } from 'ui/agg_types';

const agg = {
  id: '1',
  type: { name: 'cumulative_sum' },
  makeLabel() {
    return 'cumulative_sum';
  },
} as AggConfig;

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
] as AggConfig[];

const incompatibleAggs = [
  agg,
  {
    id: '2',
    type: { name: 'top_hits' },
    makeLabel() {
      return 'top_hits';
    },
  },
  {
    id: '3',
    type: { name: 'percentiles' },
    makeLabel() {
      return 'percentiles';
    },
  },
  {
    id: '4',
    type: { name: 'percentile_ranks' },
    makeLabel() {
      return 'percentile_ranks';
    },
  },
  {
    id: '5',
    type: { name: 'median' },
    makeLabel() {
      return 'median';
    },
  },
  {
    id: '6',
    type: { name: 'std_dev' },
    makeLabel() {
      return 'std_dev';
    },
  },
] as AggConfig[];

describe('MetricAggParamEditor', () => {
  let defaultProps: Partial<AggParamEditorProps<string>>;

  beforeEach(() => {
    defaultProps = {
      agg,
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

  describe('available options', () => {
    test('should include custom metric field into available options', () => {
      const comp = shallow(
        <MetricAggParamEditor {...(defaultProps as AggParamEditorProps<string>)} value="custom" />
      );

      expect(comp.find('EuiSelect').props()).toHaveProperty('options', [
        { text: expect.any(String), value: 'custom', disabled: false },
      ]);
    });

    test('should filter self aggregation from available options and always push cutom option into the end', () => {
      const comp = shallow(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          value="custom"
          metricAggs={[agg]}
        />
      );

      expect(comp.find('EuiSelect').props()).toHaveProperty('options', [
        { text: expect.any(String), value: 'custom', disabled: false },
      ]);
    });

    test(`should unshift an emty value into available options
      if there is no selected value (the case when the selected metric agg was removed)`, () => {
      const comp = shallow(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          metricAggs={[agg]}
        />
      );

      expect(comp.find('EuiSelect').props()).toHaveProperty('options', [
        { text: '', value: 'EMPTY_VALUE', disabled: false },
        { text: expect.any(String), value: 'custom', disabled: false },
      ]);
    });

    test('should map available options into an appropriate format', () => {
      const comp = shallow(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          value="custom"
          metricAggs={metricAggs}
        />
      );

      expect(comp.find('EuiSelect').props()).toHaveProperty('options', [
        { text: expect.any(String), value: '2', disabled: false },
        { text: expect.any(String), value: '3', disabled: false },
        { text: expect.any(String), value: '4', disabled: false },
        { text: expect.any(String), value: 'custom', disabled: false },
      ]);
    });

    test('should disable incompatible options for the metric', () => {
      const comp = shallow(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          value="custom"
          metricAggs={incompatibleAggs}
        />
      );

      expect(comp.find('EuiSelect').props()).toHaveProperty('options', [
        { text: expect.any(String), value: '2', disabled: true },
        { text: expect.any(String), value: '3', disabled: true },
        { text: expect.any(String), value: '4', disabled: true },
        { text: expect.any(String), value: '5', disabled: true },
        { text: expect.any(String), value: '6', disabled: true },
        { text: expect.any(String), value: 'custom', disabled: false },
      ]);
    });
  });

  describe('validation', () => {
    test('should be valid/invalid if value is set/unset', () => {
      const comp = mount(
        <MetricAggParamEditor {...(defaultProps as AggParamEditorProps<string>)} value="custom" />
      );

      expect(defaultProps.setValidity).lastCalledWith(true);

      comp.setProps({ value: undefined, showValidation: true });

      expect(comp.children().props()).toHaveProperty('isInvalid', true);
      expect(defaultProps.setValidity).lastCalledWith(false);
    });
  });

  describe('handle the case when any metric agg was removed', () => {
    test('should erase the value if it is no longer available', () => {
      mount(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          value="7"
          metricAggs={metricAggs}
        />
      );

      expect(defaultProps.setValue).toBeCalledWith();
    });

    test('should check if value is still available', () => {
      mount(
        <MetricAggParamEditor
          {...(defaultProps as AggParamEditorProps<string>)}
          value="2"
          metricAggs={metricAggs}
        />
      );

      expect(defaultProps.setValue).not.toBeCalled();
    });
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
