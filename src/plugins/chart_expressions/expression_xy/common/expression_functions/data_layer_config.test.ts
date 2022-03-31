/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataLayerArgs } from '../types';
import { dataLayerConfigFunction } from '../expression_functions';
import { createMockExecutionContext } from '../../../../expressions/common/mocks';
import { mockPaletteOutput } from '../__mocks__';
import { LayerTypes } from '../constants';

describe('dataLayerConfig', () => {
  test('produces the correct arguments', () => {
    const args: DataLayerArgs = {
      layerId: 'first',
      seriesType: 'line',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      splitAccessor: 'd',
      xScaleType: 'linear',
      yScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
    };

    const result = dataLayerConfigFunction.fn(null, args, createMockExecutionContext());

    expect(result).toEqual({ type: 'dataLayer', layerType: LayerTypes.DATA, ...args });
  });
});
