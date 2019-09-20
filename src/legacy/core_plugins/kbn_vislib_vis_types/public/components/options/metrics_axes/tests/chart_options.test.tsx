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
import { ChartOptions, ChartOptionsParams } from '../chart_options';
import { SeriesParam, ValueAxis } from '../../../../types';
import { Positions, ScaleTypes } from '../../../../utils/collections';
import { LineOptions } from '../line_options';
import {
  ChartTypes,
  ChartModes,
  InterpolationModes,
  interpolationModes,
  chartTypes,
  chartModes,
} from '../../../../utils/collections';

describe('ChartOptions component', () => {
  let setParamByIndex: jest.Mock;
  let changeValueAxis: jest.Mock;
  let defaultProps: ChartOptionsParams;
  let chart: SeriesParam;
  const axis = {
    id: 'ValueAxis-1',
    name: 'ValueAxis-1',
    position: Positions.LEFT,
    scale: {
      type: ScaleTypes.LINEAR,
    },
    title: {},
    show: true,
    labels: {
      show: true,
      filter: false,
      truncate: 0,
    },
  } as ValueAxis;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    changeValueAxis = jest.fn();
    chart = {
      show: true,
      type: ChartTypes.HISTOGRAM,
      mode: ChartModes.STACKED,
      data: {
        label: 'Count',
        id: '1',
      },
      drawLinesBetweenPoints: true,
      lineWidth: 2,
      showCircles: true,
      interpolate: InterpolationModes.LINEAR,
      valueAxis: 'ValueAxis-1',
    } as SeriesParam;

    defaultProps = {
      index: 0,
      chart,
      vis: {
        type: {
          editorConfig: {
            collections: { interpolationModes, chartTypes, chartModes },
          },
        },
      },
      stateParams: {
        valueAxes: [axis],
      },
      setParamByIndex,
      changeValueAxis,
    } as any;
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should show LineOptions when type is line', () => {
    chart.type = ChartTypes.LINE;
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp.find(LineOptions).exists()).toBeTruthy();
  });

  it('should show line mode when type is area', () => {
    chart.type = ChartTypes.AREA;
    const comp = shallow(<ChartOptions {...defaultProps} />);

    expect(comp.find({ paramName: 'interpolate' }).exists()).toBeTruthy();
  });

  it('should call changeValueAxis when valueAxis is changed', () => {
    const comp = mount(<ChartOptions {...defaultProps} />);
    const paramName = 'valueAxis';
    comp.find({ paramName }).prop('setValue')(paramName, 'new');

    expect(changeValueAxis).toBeCalledWith(0, paramName, 'new');
  });

  it('should call setParamByIndex when mode is changed', () => {
    const comp = mount(<ChartOptions {...defaultProps} />);
    const paramName = 'mode';
    comp.find({ paramName }).prop('setValue')(paramName, ChartModes.NORMAL);

    expect(setParamByIndex).toBeCalledWith('seriesParams', 0, paramName, ChartModes.NORMAL);
  });
});
