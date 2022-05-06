/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { xyVisFunction } from '.';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { sampleArgs, sampleLayer } from '../__mocks__';
import { XY_VIS } from '../constants';

describe('xyVis', () => {
  test('it renders with the specified data and args', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const result = await xyVisFunction.fn(
      data,
      { ...rest, ...restLayerArgs, referenceLineLayers: [], annotationLayers: [] },
      createMockExecutionContext()
    );

    expect(result).toEqual({
      type: 'render',
      as: XY_VIS,
      value: { args: { ...rest, layers: [{layerType, table: data, layerId: 'dataLayers-0', type, ...restLayerArgs}] } },
    });
  });
});
