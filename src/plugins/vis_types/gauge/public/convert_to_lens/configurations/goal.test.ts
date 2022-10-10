/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { getConfiguration } from './goal';

describe('getConfiguration', () => {
  const palette = {
    name: 'custom',
    params: { name: 'custom' },
    type: 'palette',
  } as PaletteOutput<CustomPaletteParams>;

  test('shourd return correct configuration', () => {
    const layerId = 'layer-id';
    const metricAccessor = 'metric-id';
    const breakdownByAccessor = 'bucket-id';
    const metrics = [metricAccessor];
    const buckets = [breakdownByAccessor];
    const maxAccessor = 'max-accessor-id';
    const collapseFn = 'sum';
    expect(
      getConfiguration(layerId, palette, {
        metrics,
        buckets,
        maxAccessor,
        columnsWithoutReferenced: [],
        bucketCollapseFn: { [metricAccessor]: collapseFn },
      })
    ).toEqual({
      breakdownByAccessor,
      collapseFn,
      layerId,
      layerType: 'data',
      maxAccessor,
      metricAccessor,
      palette,
    });
  });
});
