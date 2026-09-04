/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PointsLayerArgs, PointsLayerConfigResult } from '../types';
import { pointsLayerFunction } from './points_layer';

describe('pointsLayer', () => {
  test('produces the correct result', () => {
    const args: PointsLayerArgs = {
      layerId: 'layer-1',
      query: 'FROM metrics.exemplars-* | SORT @timestamp ASC | LIMIT 100',
      yAccessor: 'system.cpu.total.norm.pct',
    };

    const result = pointsLayerFunction.fn(null as any, args, {} as any);

    const expected: PointsLayerConfigResult = {
      type: 'pointsLayer',
      layerType: 'points',
      ...args,
    };

    expect(result).toEqual(expected);
  });
});
