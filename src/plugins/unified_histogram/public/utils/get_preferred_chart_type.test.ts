/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { UnifiedHistogramVisContext } from '../types';
import { getPreferredChartType } from './get_preferred_chart_type';

describe('getPreferredChartType', () => {
  it('should return the correct type if the viz type is not XY or partition chart', () => {
    const attributes = {
      visualizationType: 'lnsHeatmap',
    } as UnifiedHistogramVisContext['attributes'];
    expect(getPreferredChartType(attributes)).toEqual('Heatmap');
  });

  it('should return the correct type if the viz type is a partition chart', () => {
    const attributes = {
      visualizationType: 'lnsPie',
      state: {
        visualization: {
          shape: 'donut',
        },
      },
    } as UnifiedHistogramVisContext['attributes'];
    expect(getPreferredChartType(attributes)).toEqual('donut');
  });

  it('should return the correct type if the viz type is an XY chart', () => {
    const attributes = {
      visualizationType: 'lnsXY',
      state: {
        visualization: {
          preferredSeriesType: 'line',
        },
      },
    } as UnifiedHistogramVisContext['attributes'];
    expect(getPreferredChartType(attributes)).toEqual('line');
  });
});
