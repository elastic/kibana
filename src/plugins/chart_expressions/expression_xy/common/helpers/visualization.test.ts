/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommonXYDataLayerConfigResult } from '../types';
import { isTimeChart } from './visualization';

describe('#isTimeChart', () => {
  it('should return true if all data layers have xAccessor collumn type `date` and scaleType is `time`', () => {
    const layers: CommonXYDataLayerConfigResult[] = [
      {
        type: 'extendedDataLayer',
        layerType: 'data',
        xAccessor: 'x',
        accessors: ['y'],
        seriesType: 'bar',
        xScaleType: 'time',
        isHistogram: false,
        isHorizontal: false,
        isPercentage: false,
        isStacked: false,
        table: {
          rows: [],
          columns: [
            {
              id: 'x',
              name: 'x',
              meta: {
                type: 'date',
              },
            },
          ],
          type: 'datatable',
        },
        palette: { type: 'system_palette', name: 'system' },
      },
    ];

    expect(isTimeChart(layers)).toBeTruthy();

    layers[0].xScaleType = 'linear';

    expect(isTimeChart(layers)).toBeFalsy();

    layers[0].xScaleType = 'time';
    layers[0].table.columns[0].meta.type = 'number';

    expect(isTimeChart(layers)).toBeFalsy();
  });
});
