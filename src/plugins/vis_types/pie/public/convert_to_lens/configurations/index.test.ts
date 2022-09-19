/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfiguration } from '.';
import { samplePieVis } from '../../sample_vis.test.mocks';

describe('getConfiguration', () => {
  test('should return correct configuration', () => {
    expect(
      getConfiguration('test1', samplePieVis as any, {
        metrics: ['metric-1'],
        buckets: ['bucket-1'],
      })
    ).toEqual({
      layers: [
        {
          categoryDisplay: undefined,
          emptySizeRatio: undefined,
          layerId: 'test1',
          layerType: 'data',
          legendDisplay: 'show',
          legendMaxLines: 1,
          legendPosition: 'right',
          legendSize: 'large',
          metric: 'metric-1',
          nestedLegend: true,
          numberDisplay: 'percent',
          percentDecimals: 2,
          primaryGroups: ['bucket-1'],
          secondaryGroups: [],
          showValuesInLegend: undefined,
          truncateLegend: true,
        },
      ],
      shape: 'donut',
      palette: undefined,
    });
  });
});
