/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';
import { Column, FormulaColumn, Layer } from '../../convert';
import { createPanel, createSeries } from '../../__mocks__';
import { getConfigurationForMetric, getConfigurationForGauge } from '.';

const mockGetPalette = jest.fn();

jest.mock('../palette', () => ({
  getPalette: jest.fn(() => mockGetPalette()),
}));

function createEmptyLensLayer(partialLayer: Partial<Layer>): Layer {
  return {
    columns: [],
    columnOrder: [],
    indexPatternId: 'some-index-pattern',
    ignoreGlobalFilters: false,
    layerId: '0',
    ...partialLayer,
  };
}

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
    const layer = createEmptyLensLayer({ layerId });
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
    const layer = createEmptyLensLayer({ layerId });
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
    const layer = createEmptyLensLayer({ layerId });
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

    const layer = createEmptyLensLayer({
      layerId,
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
    });
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
    const layer = createEmptyLensLayer({
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
      layerId,
    });
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
    const layer = createEmptyLensLayer({
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
      layerId,
    });
    const config = getConfigurationForMetric(model, layer);
    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(1);
  });
});

describe('getConfigurationForGauge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPalette.mockReturnValue(undefined);
  });

  const metricId = 'some-id';
  const maxColumnId = 'col-id-1';
  const metric = { id: metricId, type: METRIC_TYPES.COUNT };
  const gaugeMaxColumn: FormulaColumn = {
    references: [],
    columnId: maxColumnId,
    operationType: 'formula',
    isBucketed: false,
    isSplit: false,
    dataType: 'number',
    params: { formula: '100' },
    meta: { metricId },
  };

  test('should return null if no series was provided', () => {
    const layerId = 'layer-id-1';
    const model = createPanel({ series: [] });
    const layer = createEmptyLensLayer({ layerId });
    const config = getConfigurationForGauge(model, layer, undefined, gaugeMaxColumn);

    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return null if only series agg', () => {
    const layerId = 'layer-id-1';
    const metric1 = { id: 'metric-id-2', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'min' };
    const model = createPanel({
      series: [createSeries({ metrics: [metric1] })],
    });
    const layer = createEmptyLensLayer({ layerId });
    const config = getConfigurationForGauge(model, layer, undefined, gaugeMaxColumn);

    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return null if palette is invalid', () => {
    mockGetPalette.mockReturnValueOnce(null);
    const layerId = 'layer-id-1';
    const columnId = 'col-id-1';
    const model = createPanel({
      series: [createSeries({ metrics: [metric] })],
    });
    const layer = createEmptyLensLayer({
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
      layerId,
    });
    const config = getConfigurationForGauge(model, layer, undefined, gaugeMaxColumn);
    expect(config).toBeNull();
    expect(mockGetPalette).toBeCalledTimes(1);
  });

  test('should return config with color if palette is not valid', () => {
    const layerId = 'layer-id-1';
    const metric1 = { id: 'metric-id-1', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'sum' };
    const color = '#fff';
    const model = createPanel({ series: [createSeries({ metrics: [metric, metric1], color })] });
    const layer = createEmptyLensLayer({ layerId });
    const config = getConfigurationForGauge(model, layer, undefined, gaugeMaxColumn);

    expect(config).toEqual({
      breakdownByAccessor: undefined,
      collapseFn: 'sum',
      layerId: 'layer-id-1',
      layerType: 'data',
      metricAccessor: undefined,
      palette: undefined,
      maxAccessor: maxColumnId,
      color: '#FFFFFF',
      showBar: true,
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });

  test('should return config with palette', () => {
    const palette = { type: 'custom', name: 'default', params: {} };
    mockGetPalette.mockReturnValue(palette);
    const layerId = 'layer-id-1';
    const columnId1 = 'col-id-1';

    const metric1 = { id: 'metric-id-1', type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'sum' };
    const color = '#fff';
    const model = createPanel({ series: [createSeries({ metrics: [metric, metric1], color })] });
    const bucketColumnId = 'bucket-column-id-1';
    const bucket = { columnId: bucketColumnId } as Column;
    const layer = createEmptyLensLayer({
      columns: [
        {
          columnId: columnId1,
          operationType: 'count',
          dataType: 'number',
          params: {},
          sourceField: 'document',
          isBucketed: false,
          isSplit: false,
          meta: { metricId },
        },
      ],
      layerId,
    });
    const config = getConfigurationForGauge(model, layer, bucket, gaugeMaxColumn);

    expect(config).toEqual({
      breakdownByAccessor: bucket.columnId,
      collapseFn: 'sum',
      layerId,
      layerType: 'data',
      metricAccessor: columnId1,
      palette,
      maxAccessor: maxColumnId,
      showBar: true,
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });
});
