/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataLayerConfigResult, XYChartProps } from '../../common';
import { sampleArgs } from '../../common/__mocks__';
import { calculateMinInterval } from './interval';

describe('calculateMinInterval', () => {
  let xyProps: XYChartProps;
  let layer: DataLayerConfigResult;
  beforeEach(() => {
    const { layers, ...restArgs } = sampleArgs().args;

    xyProps = { args: { ...restArgs, layers } };
    layer = xyProps.args.layers[0] as DataLayerConfigResult;
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
    const result = await calculateMinInterval(xyProps);
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
    const result = await calculateMinInterval(xyProps);
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
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if interval can not be checked', async () => {
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if date column is not found', async () => {
    layer.table.columns.splice(2, 1);
    xyProps.args.layers[0] = layer;
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if x axis is not a date', async () => {
    layer.xScaleType = 'ordinal';
    xyProps.args.layers[0] = layer;
    xyProps.args.layers[0].table.columns.splice(2, 1);
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });
});
