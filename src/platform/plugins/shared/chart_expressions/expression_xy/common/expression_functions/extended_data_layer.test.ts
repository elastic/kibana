/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExtendedDataLayerArgs } from '../types';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { mockPaletteOutput, sampleArgs } from '../__mocks__';
import { LayerTypes } from '../constants';
import { extendedDataLayerFunction } from './extended_data_layer';

describe('extendedDataLayerConfig', () => {
  const args: ExtendedDataLayerArgs = {
    seriesType: 'line',
    xAccessor: 'c',
    accessors: ['a', 'b'],
    splitAccessors: ['d'],
    xScaleType: 'linear',
    isHistogram: false,
    isHorizontal: false,
    isPercentage: false,
    isStacked: false,
    palette: mockPaletteOutput,
  };

  test('produces the correct arguments', async () => {
    const { data } = sampleArgs();
    const fullArgs: ExtendedDataLayerArgs = {
      ...args,
      markSizeAccessor: 'b',
      showPoints: true,
      lineWidth: 10,
      pointsRadius: 10,
    };

    const result = await extendedDataLayerFunction.fn(data, fullArgs, createMockExecutionContext());

    expect(result).toEqual({
      type: 'extendedDataLayer',
      layerType: LayerTypes.DATA,
      ...fullArgs,
      table: data,
      showLines: true,
    });
  });

  test('throws the error if markSizeAccessor is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();

    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, seriesType: 'bar', markSizeAccessor: 'b' },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test("throws the error if markSizeAccessor doesn't have the corresponding column in the table", async () => {
    const { data } = sampleArgs();

    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, markSizeAccessor: 'nonsense' },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('throws the error if lineWidth is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();
    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, seriesType: 'bar', lineWidth: 10 },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('throws the error if showPoints is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();

    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, seriesType: 'bar', showPoints: true },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('throws the error if pointsRadius is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();

    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, seriesType: 'bar', pointsRadius: 10 },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('throws the error if showLines is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();

    expect(
      extendedDataLayerFunction.fn(
        data,
        { ...args, seriesType: 'bar', showLines: true },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
