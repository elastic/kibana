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

  beforeEach(() => {
    xyProps = sampleArgs();
    (xyProps.args.layers[0] as DataLayerConfigResult).xScaleType = 'time';
  });
  it('should use first valid layer and determine interval', async () => {
    xyProps.data.tables.first.columns[2].meta.source = 'esaggs';
    xyProps.data.tables.first.columns[2].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: '5m',
      },
    };
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(5 * 60 * 1000);
  });

  it('should return interval of number histogram if available on first x axis columns', async () => {
    (xyProps.args.layers[0] as DataLayerConfigResult).xScaleType = 'linear';
    xyProps.data.tables.first.columns[2].meta = {
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
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(5);
  });

  it('should return undefined if data table is empty', async () => {
    xyProps.data.tables.first.rows = [];
    xyProps.data.tables.first.columns[2].meta.source = 'esaggs';
    xyProps.data.tables.first.columns[2].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: '5m',
      },
    };
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if interval can not be checked', async () => {
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if date column is not found', async () => {
    xyProps.data.tables.first.columns.splice(2, 1);
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });

  it('should return undefined if x axis is not a date', async () => {
    (xyProps.args.layers[0] as DataLayerConfigResult).xScaleType = 'ordinal';
    xyProps.data.tables.first.columns.splice(2, 1);
    const result = await calculateMinInterval(xyProps);
    expect(result).toEqual(undefined);
  });
});
