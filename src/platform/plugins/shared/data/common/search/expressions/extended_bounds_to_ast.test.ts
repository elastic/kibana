/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extendedBoundsToAst } from './extended_bounds_to_ast';

describe('extendedBoundsToAst', () => {
  it('should return an expression', () => {
    expect(extendedBoundsToAst({ min: 10, max: 100 })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(extendedBoundsToAst({ min: 10, max: 100 })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        min: [10],
        max: [100],
      })
    );
  });
});
