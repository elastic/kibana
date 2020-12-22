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

import { ChartOptions, ChartOptionsParams } from './chart_options';
import { SeriesParam, ChartMode } from '../../../../types';
import { LineOptions } from './line_options';
import { valueAxis, seriesParam, vis } from './mocks';
import { ChartType } from '../../../../../common';

describe('ChartOptions component', () => {
  let setParamByIndex: jest.Mock;
  let changeValueAxis: jest.Mock;
  let defaultProps: ChartOptionsParams;
  let chart: SeriesParam;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    changeValueAxis = jest.fn();
    chart = { ...seriesParam };

    defaultProps = {
      index: 0,
      chart,
      vis,
      valueAxes: [valueAxis],
      setParamByIndex,
      changeValueAxis,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should show LineOptions when type is line', () => {
    chart.type = ChartType.Line;
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp.find(LineOptions).exists()).toBeTruthy();
  });

  it('should show line mode when type is area', () => {
    chart.type = ChartType.Area;
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp.find({ paramName: 'interpolate' }).exists()).toBeTruthy();
  });

  it('should call changeValueAxis when valueAxis is changed', () => {
    const comp = shallow(<ChartOptions {...defaultProps} />);
    const paramName = 'valueAxis';
    const value = 'new';
    comp.find({ paramName }).prop('setValue')(paramName, value);

    expect(changeValueAxis).toBeCalledWith(0, paramName, value);
  });

  it('should call setParamByIndex when mode is changed', () => {
    const comp = shallow(<ChartOptions {...defaultProps} />);
    const paramName = 'mode';
    comp.find({ paramName }).prop('setValue')(paramName, ChartMode.Normal);

    expect(setParamByIndex).toBeCalledWith('seriesParams', 0, paramName, ChartMode.Normal);
  });
});
