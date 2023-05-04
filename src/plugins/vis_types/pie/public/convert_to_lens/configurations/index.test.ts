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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return correct configuration', () => {
    samplePieVis.uiState.get.mockReturnValueOnce(undefined);
    expect(
      getConfiguration('test1', samplePieVis as any, {
        metrics: ['metric-1'],
        buckets: { all: ['bucket-1'], customBuckets: {} },
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
          metrics: ['metric-1'],
          nestedLegend: true,
          numberDisplay: 'percent',
          percentDecimals: 2,
          primaryGroups: ['bucket-1'],
          secondaryGroups: [],
          showValuesInLegend: true,
          truncateLegend: true,
        },
      ],
      shape: 'donut',
      palette: undefined,
    });
  });

  test('should return legendDisplay = show if uiState contains truthy value', () => {
    samplePieVis.uiState.get.mockReturnValueOnce(true);
    expect(
      getConfiguration(
        'test1',
        { ...samplePieVis, params: { ...samplePieVis.params, legendDisplay: 'hide' } } as any,
        {
          metrics: ['metric-1'],
          buckets: { all: ['bucket-1'], customBuckets: {} },
        }
      )
    ).toEqual({
      layers: [expect.objectContaining({ legendDisplay: 'show' })],
      shape: 'donut',
      palette: undefined,
    });
  });

  test('should return legendDisplay = hide if uiState contains falsy value', () => {
    samplePieVis.uiState.get.mockReturnValueOnce(false);
    expect(
      getConfiguration(
        'test1',
        { ...samplePieVis, params: { ...samplePieVis.params, legendDisplay: 'show' } } as any,
        {
          metrics: ['metric-1'],
          buckets: { all: ['bucket-1'], customBuckets: {} },
        }
      )
    ).toEqual({
      layers: [expect.objectContaining({ legendDisplay: 'hide' })],
      shape: 'donut',
      palette: undefined,
    });
  });

  test('should return value of legendDisplay if uiState contains undefined value', () => {
    samplePieVis.uiState.get.mockReturnValueOnce(undefined);
    const legendDisplay = 'show';
    expect(
      getConfiguration(
        'test1',
        { ...samplePieVis, params: { ...samplePieVis.params, legendDisplay } } as any,
        {
          metrics: ['metric-1'],
          buckets: { all: ['bucket-1'], customBuckets: {} },
        }
      )
    ).toEqual({
      layers: [expect.objectContaining({ legendDisplay })],
      shape: 'donut',
      palette: undefined,
    });
  });
});
