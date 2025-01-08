/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import { DataLayerConfig, XYChartProps } from '../../common';
import { sampleArgs } from '../../common/__mocks__';
import { calculateMinInterval } from './interval';

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
