/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createPanel } from '../../__mocks__';
import { getConfigurationForTopN, getConfigurationForTimeseries } from './configuration';

describe('getConfigurationForTimeseries', () => {
  test('should return correct configuration for timeseries', () => {
    expect(getConfigurationForTimeseries(createPanel(), [])).toEqual({
      layers: [],
      fillOpacity: 0.5,
      legend: {
        isVisible: false,
        showSingleSeries: false,
        position: 'right',
        shouldTruncate: false,
        maxLines: 1,
      },
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: false,
      },
      yLeftExtent: { mode: 'full' },
      yRightExtent: { mode: 'full' },
      yLeftScale: 'linear',
      yRightScale: 'linear',
    });
  });
});

describe('getConfigurationForTopN', () => {
  test('should return correct configuration for top n', () => {
    expect(getConfigurationForTopN(createPanel(), [])).toEqual({
      layers: [],
      fillOpacity: 0.5,
      legend: {
        isVisible: false,
        showSingleSeries: false,
        position: 'right',
        shouldTruncate: false,
        maxLines: 1,
      },
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: false,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: false,
        yRight: false,
      },
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: false,
      },
      valueLabels: 'show',
    });
  });
});
