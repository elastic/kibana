/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfig } from './get_config';
import { visData, visDataPercentile, visParamsWithTwoYAxes } from '../mocks';
import { VisParams } from '../types';

// ToDo: add more tests for all the config properties
describe('getConfig', () => {
  it('identifies it as a timeChart if the x axis has a date field', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.isTimeChart).toBe(true);
  });

  it('not adds the current time marker if the param is set to false', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.showCurrentTime).toBe(false);
  });

  it('adds the current time marker if the param is set to false', () => {
    const newVisParams = {
      ...visParamsWithTwoYAxes,
      addTimeMarker: true,
    };
    const config = getConfig(visData, newVisParams);
    expect(config.showCurrentTime).toBe(true);
  });

  it('enables the histogram mode for a date_histogram', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.enableHistogramMode).toBe(true);
  });

  it('assigns the correct formatter per y axis', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.yAxes.length).toBe(2);
    expect(config.yAxes[0].ticks?.formatter).toStrictEqual(config.aspects.y[0].formatter);
    expect(config.yAxes[1].ticks?.formatter).toStrictEqual(config.aspects.y[1].formatter);
  });

  it('assigns the correct number of yAxes if the agg is hidden', () => {
    // We have two axes but the one y dimension is hidden
    const newVisParams = {
      ...visParamsWithTwoYAxes,
      dimensions: {
        ...visParamsWithTwoYAxes.dimensions,
        y: [
          {
            label: 'Average memory',
            aggType: 'avg',
            params: {},
            accessor: 1,
            format: {
              id: 'number',
              params: {},
            },
          },
        ],
      },
    };
    const config = getConfig(visData, newVisParams);
    expect(config.yAxes.length).toBe(1);
  });

  it('assigns the correct number of yAxes if the agg is Percentile', () => {
    const newVisParams = {
      ...visParamsWithTwoYAxes,
      seriesParams: [
        {
          type: 'line',
          data: {
            label: 'Percentiles of bytes',
            id: '1',
          },
          drawLinesBetweenPoints: true,
          interpolate: 'linear',
          lineWidth: 2,
          mode: 'normal',
          show: true,
          showCircles: true,
          circlesRadius: 3,
          valueAxis: 'ValueAxis-1',
        },
      ],
      dimensions: {
        ...visParamsWithTwoYAxes.dimensions,
        y: ['1st', '5th', '25th', '50th', '75th', '95th', '99th'].map((prefix, accessor) => ({
          label: `${prefix} percentile of bytes`,
          aggType: 'percentiles',
          params: {},
          accessor,
          format: {
            id: 'number',
            params: {},
          },
        })),
      },
    } as VisParams;
    const config = getConfig(visDataPercentile, newVisParams);
    expect(config.yAxes.length).toBe(1);
  });
});
