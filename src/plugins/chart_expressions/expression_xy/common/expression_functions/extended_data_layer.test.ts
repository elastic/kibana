/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExtendedDataLayerArgs } from '../types';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { mockPaletteOutput, sampleArgs } from '../__mocks__';
import { LayerTypes } from '../constants';
import { extendedDataLayerFunction } from './extended_data_layer';

describe('extendedDataLayerConfig', () => {
  test('produces the correct arguments', async () => {
    const { data } = sampleArgs();
    const args: ExtendedDataLayerArgs = {
      seriesType: 'line',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      splitAccessor: 'd',
      xScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
      markSizeAccessor: 'b',
    };

    const result = await extendedDataLayerFunction.fn(data, args, createMockExecutionContext());

    expect(result).toEqual({
      type: 'extendedDataLayer',
      layerType: LayerTypes.DATA,
      ...args,
      table: data,
    });
  });

  test('throws the error if markSizeAccessor is provided to the not line/area chart', async () => {
    const { data } = sampleArgs();
    const args: ExtendedDataLayerArgs = {
      seriesType: 'bar',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      splitAccessor: 'd',
      xScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
      markSizeAccessor: 'b',
    };

    expect(
      extendedDataLayerFunction.fn(data, args, createMockExecutionContext())
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test("throws the error if markSizeAccessor doesn't have the corresponding column in the table", async () => {
    const { data } = sampleArgs();
    const args: ExtendedDataLayerArgs = {
      seriesType: 'line',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      splitAccessor: 'd',
      xScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
      markSizeAccessor: 'nonsense',
    };

    expect(
      extendedDataLayerFunction.fn(data, args, createMockExecutionContext())
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
