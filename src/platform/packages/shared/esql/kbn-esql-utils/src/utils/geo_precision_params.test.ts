/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGeoPrecisionParamValues } from './geo_precision_params';

describe('getGeoPrecisionParamValues', () => {
  it('only returns values for the params used by the query', () => {
    expect(
      getGeoPrecisionParamValues('FROM a | STATS c = COUNT() BY ?_geohex_precision', 4.5)
    ).toEqual({ geohex: 4 });
  });

  it('returns all values when the query uses all params', () => {
    expect(
      getGeoPrecisionParamValues(
        'FROM a | WHERE ?_geotile_precision > 0 AND ?_geohex_precision > 0 AND ?_geohash_precision > 0',
        30
      )
    ).toEqual({ geotile: 29, geohex: 15, geohash: 12 });
  });

  it('returns nothing when the query uses no precision params', () => {
    expect(getGeoPrecisionParamValues('FROM a', 4.5)).toEqual({});
  });
});
