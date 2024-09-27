/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { geoPointToAst } from './geo_point_to_ast';

describe('geoPointToAst', () => {
  it('should return an expression', () => {
    expect(geoPointToAst({ lat: 1, lon: 2 })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(geoPointToAst({ lat: 1, lon: 2 })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        lat: [1],
        lon: [2],
      })
    );

    expect(geoPointToAst([1, 2])).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        point: [1, 2],
      })
    );
  });
});
