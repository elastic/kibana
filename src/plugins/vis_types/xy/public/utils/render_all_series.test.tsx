/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { AreaSeries, BarSeries, CurveType } from '@elastic/charts';
import { DatatableRow } from '@kbn/expressions-plugin/public';
import { renderAllSeries } from './render_all_series';
import {
  getVisConfig,
  getVisConfigPercentiles,
  getPercentilesData,
  getVisConfigMutipleYaxis,
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
    circlesRadius: 3,
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

  it('renders percentage data for percentage mode', () => {
    const barSeriesParams = [{ ...defaultSeriesParams[0], type: 'histogram', mode: 'percentage' }];
    const config = getVisConfig();

    const renderBarSeries = renderAllSeries(
      config,
      barSeriesParams as SeriesParam[],
      defaultData,
      jest.fn(),
      jest.fn(),
      'Europe/Athens',
      'col-0-2',
      []
    );
    const wrapper = shallow(<div>{renderBarSeries}</div>);
    expect(wrapper.find(BarSeries).length).toBe(1);
    expect(wrapper.find(BarSeries).prop('stackMode')).toEqual('percentage');
    expect(wrapper.find(BarSeries).prop('data')).toEqual([
      {
        'col-0-2': 1610960220000,
        'col-1-3': 1,
      },
      {
        'col-0-2': 1610961300000,
        'col-1-3': 1,
      },
      {
        'col-0-2': 1610961900000,
        'col-1-3': 1,
      },
      {
        'col-0-2': 1610962980000,
        'col-1-3': 1,
      },
    ]);
  });

  it('renders the correct yAccessors for not percentile aggs', () => {
    const renderSeries = getAllSeries(getVisConfig(), defaultSeriesParams, defaultData);
    const wrapper = shallow(<div>{renderSeries}</div>);
    expect(wrapper.find(AreaSeries).prop('yAccessors')).toEqual(['col-1-3']);
  });

  it('renders the correct yAccessors for multiple yAxis', () => {
    const mutipleYAxisConfig = getVisConfigMutipleYaxis();
    const renderMutipleYAxisSeries = renderAllSeries(
      mutipleYAxisConfig,
      defaultSeriesParams as SeriesParam[],
      defaultData,
      jest.fn(),
      jest.fn(),
      'Europe/Athens',
      'col-0-2',
      []
    );
    const wrapper = shallow(<div>{renderMutipleYAxisSeries}</div>);
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

  it('defaults the CurveType to linear', () => {
    const renderSeries = getAllSeries(getVisConfig(), defaultSeriesParams, defaultData);
    const wrapper = shallow(<div>{renderSeries}</div>);
    expect(wrapper.find(AreaSeries).prop('curve')).toEqual(CurveType.LINEAR);
  });
});
