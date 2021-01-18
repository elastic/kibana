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
import { AreaSeries, BarSeries, CurveType } from '@elastic/charts';
import { DatatableRow } from '../../../expressions/public';
import { renderAllSeries } from './render_all_series';
import {
  getVisConfig,
  getVisConfigPercentiles,
  getPercentilesData,
} from './render_all_series.test.mocks';
import { SeriesParam, VisConfig } from '../types';

const defaultSeriesParams = [
  {
    data: {
      id: '3',
      label: 'Label',
    },
    drawLinesBetweenPoints: true,
    interpolate: 'linear',
    lineWidth: 2,
    mode: 'stacked',
    show: true,
    showCircles: true,
    type: 'area',
    valueAxis: 'ValueAxis-1',
  },
] as SeriesParam[];

const defaultData = [
  {
    'col-0-2': 1610960220000,
    'col-1-3': 26.984375,
  },
  {
    'col-0-2': 1610961300000,
    'col-1-3': 30.99609375,
  },
  {
    'col-0-2': 1610961900000,
    'col-1-3': 38.49609375,
  },
  {
    'col-0-2': 1610962980000,
    'col-1-3': 35.2421875,
  },
];

describe('renderAllSeries', function () {
  const getAllSeries = (visConfig: VisConfig, params: SeriesParam[], data: DatatableRow[]) => {
    return renderAllSeries(
      visConfig,
      params,
      data,
      jest.fn(),
      jest.fn(),
      'Europe/Athens',
      'col-0-2',
      []
    );
  };

  it('renders an area Series and not a bar series if type is area', () => {
    const renderSeries = getAllSeries(getVisConfig(), defaultSeriesParams, defaultData);
    const wrapper = shallow(<div>{renderSeries}</div>);
    expect(wrapper.find(AreaSeries).length).toBe(1);
    expect(wrapper.find(BarSeries).length).toBe(0);
  });

  it('renders a bar Series in case of histogram', () => {
    const barSeriesParams = [{ ...defaultSeriesParams[0], type: 'histogram' }];

    const renderBarSeries = renderAllSeries(
      getVisConfig(),
      barSeriesParams as SeriesParam[],
      defaultData,
      jest.fn(),
      jest.fn(),
      'Europe/Athens',
      'col-0-2',
      []
    );
    const wrapper = shallow(<div>{renderBarSeries}</div>);
    expect(wrapper.find(AreaSeries).length).toBe(0);
    expect(wrapper.find(BarSeries).length).toBe(1);
  });

  it('renders the correct yAccessors for not percentile aggs', () => {
    const renderSeries = getAllSeries(getVisConfig(), defaultSeriesParams, defaultData);
    const wrapper = shallow(<div>{renderSeries}</div>);
    expect(wrapper.find(AreaSeries).prop('yAccessors')).toEqual(['col-1-3']);
  });

  it('renders the correct yAccessors for percentile aggs', () => {
    const percentilesConfig = getVisConfigPercentiles();
    const percentilesData = getPercentilesData();
    const renderPercentileSeries = renderAllSeries(
      percentilesConfig,
      defaultSeriesParams as SeriesParam[],
      percentilesData,
      jest.fn(),
      jest.fn(),
      'Europe/Athens',
      'col-0-2',
      []
    );
    const wrapper = shallow(<div>{renderPercentileSeries}</div>);
    expect(wrapper.find(AreaSeries).prop('yAccessors')).toEqual([
      'col-1-3.1',
      'col-2-3.5',
      'col-3-3.25',
      'col-4-3.50',
      'col-5-3.75',
      'col-6-3.95',
      'col-7-3.99',
    ]);
  });

  it('defaults the CurveType to linear if', () => {
    const renderSeries = getAllSeries(getVisConfig(), defaultSeriesParams, defaultData);
    const wrapper = shallow(<div>{renderSeries}</div>);
    expect(wrapper.find(AreaSeries).prop('curve')).toEqual(CurveType.LINEAR);
  });
});
