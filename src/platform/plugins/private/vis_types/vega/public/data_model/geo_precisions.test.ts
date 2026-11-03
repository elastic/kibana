/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGeoPrecisionsForZoom } from './geo_precisions';

describe('getGeoPrecisionsForZoom', () => {
  test('returns the MOST_FINE precisions', () => {
    expect(getGeoPrecisionsForZoom(4.5)).toEqual({ geotile: 9, geohex: 4, geohash: 4 });
  });

  test('caps at the maximum precisions', () => {
    expect(getGeoPrecisionsForZoom(30)).toEqual({ geotile: 29, geohex: 15, geohash: 12 });
  });
});
