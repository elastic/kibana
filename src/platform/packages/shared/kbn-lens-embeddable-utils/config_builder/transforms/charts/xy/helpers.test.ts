/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYPersistedState } from '@kbn/lens-common';
import { normalizeLegacySeriesTypes } from './helpers';

const getState = (seriesType: string) =>
  ({
    preferredSeriesType: seriesType,
    layers: [
      { layerId: 'data', layerType: 'data', seriesType, accessors: [] },
      { layerId: 'ref', layerType: 'referenceLine', accessors: [] },
    ],
  } as unknown as XYPersistedState);

describe('normalizeLegacySeriesTypes', () => {
  it.each([
    ['area_unstacked', 'area'],
    ['bar_unstacked', 'bar'],
  ])('converts %s to %s', (legacy, current) => {
    const { preferredSeriesType, layers } = normalizeLegacySeriesTypes(getState(legacy));

    expect(preferredSeriesType).toBe(current);
    expect(layers[0]).toMatchObject({ seriesType: current });
    expect(layers[1]).not.toHaveProperty('seriesType');
  });

  it('keeps current series types', () => {
    const state = getState('area_stacked');

    expect(normalizeLegacySeriesTypes(state)).toEqual(state);
  });
});
