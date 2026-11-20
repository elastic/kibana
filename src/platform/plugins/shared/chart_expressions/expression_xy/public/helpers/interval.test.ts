/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import type { DataLayerConfig, XYChartProps } from '../../common';
import { sampleArgs } from '../../common/test_utils';
import { calculateMinInterval, getLayerBucketEnd } from './interval';

describe('calculateMinInterval', () => {
  const datatableUtilities = createDatatableUtilitiesMock();
  let xyProps: XYChartProps;
  let layer: DataLayerConfig;
  beforeEach(() => {
    const { layers, ...restArgs } = sampleArgs().args;

    xyProps = {
      args: { ...restArgs, layers },
      syncColors: false,
      syncTooltips: false,
      syncCursor: true,
    };
    layer = xyProps.args.layers[0] as DataLayerConfig;
    layer.xScaleType = 'time';
  });
  it('should use first valid layer and determine interval', async () => {
    layer.table.columns[2].meta.source = 'esaggs';
    layer.table.columns[2].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: '5m',
      },
    };
    xyProps.args.layers[0] = layer;
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(5 * 60 * 1000);
  });

  it('should return interval of number histogram if available on first x axis columns', async () => {
    layer.xScaleType = 'linear';
    layer.table.columns[2].meta = {
      source: 'esaggs',
      type: 'number',
      field: 'someField',
      sourceParams: {
        type: 'histogram',
        params: {
          interval: 'auto',
          used_interval: 5,
        },
      },
    };
    xyProps.args.layers[0] = layer;
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(5);
  });

  it('should return undefined if data table is empty', async () => {
    layer.table.rows = [];
    layer.table.columns[2].meta.source = 'esaggs';
    layer.table.columns[2].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: '5m',
      },
    };

    xyProps.args.layers[0] = layer;
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if interval can not be checked', async () => {
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if date column is not found', async () => {
    layer.table.columns.splice(2, 1);
    xyProps.args.layers[0] = layer;
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if x axis is not a date', async () => {
    layer.xScaleType = 'ordinal';
    xyProps.args.layers[0] = layer;
    xyProps.args.layers[0].table.columns.splice(2, 1);
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return specified interval if user provided it as `xAxisInterval`', async () => {
    layer.table.columns[2].meta.source = 'esaggs';
    layer.table.columns[2].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: '5m',
      },
    };
    xyProps.args.layers[0] = layer;
    xyProps.args.minTimeBarInterval = '1h';
    const result = await calculateMinInterval(datatableUtilities, xyProps);
    expect(result).toEqual(60 * 60 * 1000);
  });
});

describe('getLayerBucketEnd', () => {
  const datatableUtilities = createDatatableUtilitiesMock();

  const createLayer = (bucket?: { interval: number; unit?: string }) => {
    const layer = sampleArgs().args.layers[0] as DataLayerConfig;
    layer.table.columns[2].meta = {
      type: bucket?.unit ? 'date' : 'number',
      ...(bucket ? { esMeta: { bucket } } : {}),
    };
    return layer;
  };

  const getEnd = (layer: DataLayerConfig, bucketStart: string, timeZone = 'UTC') => {
    const bucketEnd = getLayerBucketEnd(datatableUtilities, layer, timeZone);
    return bucketEnd && new Date(bucketEnd(Date.parse(bucketStart))).toISOString();
  };

  it('ends calendar months on the first day of the next month', () => {
    const layer = createLayer({ interval: 1, unit: 'month' });
    expect(getEnd(layer, '2026-02-01T00:00:00.000Z')).toBe('2026-03-01T00:00:00.000Z');
    expect(getEnd(layer, '2026-03-01T00:00:00.000Z')).toBe('2026-04-01T00:00:00.000Z');
  });

  it('follows DST changes in the chart time zone', () => {
    const layer = createLayer({ interval: 1, unit: 'day' });
    expect(getEnd(layer, '2026-03-28T23:00:00.000Z', 'Europe/Rome')).toBe(
      '2026-03-29T22:00:00.000Z'
    );
  });

  it('adds the interval of numeric buckets', () => {
    const bucketEnd = getLayerBucketEnd(datatableUtilities, createLayer({ interval: 5 }), 'UTC');
    expect(bucketEnd?.(10)).toBe(15);
  });

  it('returns undefined when the X column has no known interval', () => {
    expect(getLayerBucketEnd(datatableUtilities, createLayer(), 'UTC')).toBeUndefined();
  });
});
