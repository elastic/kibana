/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';
import { Column, Layer } from '../../convert';
import { createPanel, createSeries } from '../../__mocks__';
import { getConfigurationForMetric } from '.';

const mockGetPalette = jest.fn();

jest.mock('./palette', () => ({
  getPalette: jest.fn(() => mockGetPalette()),
}));

describe('getConfigurationForMetric', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPalette.mockReturnValue(undefined);
  });

  const metricId = 'some-id';
  const metric = { id: metricId, type: METRIC_TYPES.COUNT };
  test('should return null if no series was provided', () => {
    const layerId = 'layer-id-1';
    const model = createPanel({ series: [] });
    const layer: Layer = {
      columns: [],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer);

    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return null if only series agg', () => {
    const layerId = 'layer-id-1';
    const metric1 = { id: 'metric-id-2', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'min' };
    const model = createPanel({
      series: [createSeries({ metrics: [metric1] })],
    });
    const layer: Layer = {
      columns: [],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer);

    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return null if multiple series aggs', () => {
    const layerId = 'layer-id-1';
    const metric1 = { id: 'metric-id-1', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'sum' };
    const metric2 = { id: 'metric-id-2', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'min' };
    const model = createPanel({
      series: [
        createSeries({ metrics: [metric, metric1] }),
        createSeries({ metrics: [metric, metric2] }),
      ],
    });
    const layer: Layer = {
      columns: [],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer);

    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return config if only one series agg is specified', () => {
    const layerId = 'layer-id-1';
    const metricId1 = 'metric-id-1';

    const metricId2 = 'metric-id-2';
    const metric1 = { id: metricId1, type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'sum' };
    const metric2 = { ...metric, id: metricId2 };
    const columnId1 = 'col-id-1';
    const columnId2 = 'col-id-2';

    const model = createPanel({
      series: [createSeries({ metrics: [metric, metric1] }), createSeries({ metrics: [metric2] })],
    });
    const layer: Layer = {
      columns: [
        {
          columnId: columnId1,
          meta: { metricId },
        },
        {
          columnId: columnId2,
          meta: { metricId: metricId2 },
        },
      ] as Column[],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer);

    expect(config).toEqual({
      breakdownByAccessor: undefined,
      collapseFn: 'sum',
      layerId,
      layerType: 'data',
      metricAccessor: columnId1,
      palette: undefined,
      secondaryMetricAccessor: columnId2,
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });

  test('should return config for single metric', () => {
    const layerId = 'layer-id-1';
    const columnId = 'col-id-1';
    const bucketColumnId = 'col-id-2';
    const model = createPanel({
      series: [createSeries({ metrics: [metric] })],
    });
    const bucket = { columnId: bucketColumnId } as Column;
    const layer: Layer = {
      columns: [
        {
          columnId,
          operationType: 'count',
          dataType: 'number',
          params: {},
          sourceField: 'document',
          isBucketed: false,
          isSplit: false,
          meta: { metricId },
        },
      ],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer, bucket);

    expect(config).toEqual({
      layerId,
      layerType: 'data',
      metricAccessor: columnId,
      breakdownByAccessor: bucketColumnId,
      collapseFn: undefined,
      palette: undefined,
      secondaryMetricAccessor: undefined,
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });

  test('should return null if palette is invalid', () => {
    mockGetPalette.mockReturnValue(null);
    const layerId = 'layer-id-1';
    const columnId = 'col-id-1';
    const model = createPanel({
      series: [createSeries({ metrics: [metric] })],
    });
    const layer: Layer = {
      columns: [
        {
          columnId,
          operationType: 'count',
          dataType: 'number',
          params: {},
          sourceField: 'document',
          isBucketed: false,
          isSplit: false,
          meta: { metricId },
        },
      ],
      columnOrder: [],
      indexPatternId: 'some-index-pattern',
      layerId,
    };
    const config = getConfigurationForMetric(model, layer);
    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(1);
  });
});
