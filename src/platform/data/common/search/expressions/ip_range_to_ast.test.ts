/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ipRangeToAst } from './ip_range_to_ast';

describe('ipRangeToAst', () => {
  it('should return an expression', () => {
    expect(ipRangeToAst({ from: '0.0.0.0', to: '128.0.0.0' })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(ipRangeToAst({ from: '0.0.0.0', to: '128.0.0.0' })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({
        from: ['0.0.0.0'],
        to: ['128.0.0.0'],
      })
    );
  });
});
