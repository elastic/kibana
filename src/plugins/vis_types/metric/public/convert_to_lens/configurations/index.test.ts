/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { getPercentageModeConfig } from '.';
import { VisParams } from '../../types';

describe('getPercentageModeConfig', () => {
  const params: VisParams = {
    addTooltip: false,
    addLegend: false,
    dimensions: {} as VisParams['dimensions'],
    metric: {
      percentageMode: false,
      percentageFormatPattern: '',
      useRanges: true,
      colorSchema: ColorSchemas.Greys,
      metricColorMode: 'Labels',
      colorsRange: [
        { type: 'range', from: 0, to: 100 },
        { type: 'range', from: 100, to: 200 },
        { type: 'range', from: 200, to: 300 },
      ],
      labels: {},
      invertColors: false,
      style: {} as VisParams['metric']['style'],
    },
    type: 'metric',
  };

  test('should return falsy percentage mode if percentage mode is off', () => {
    expect(getPercentageModeConfig(params)).toEqual({ isPercentageMode: false });
  });

  test('should return falsy percentage mode if metric color mode is `None`', () => {
    expect(
      getPercentageModeConfig({ ...params, metric: { ...params.metric, metricColorMode: `None` } })
    ).toEqual({ isPercentageMode: false });
  });

  test('should return percentage mode config', () => {
    expect(
      getPercentageModeConfig({ ...params, metric: { ...params.metric, percentageMode: true } })
    ).toEqual({ isPercentageMode: true, min: 0, max: 300 });
  });
});
