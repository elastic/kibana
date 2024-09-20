/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cidrToAst } from './cidr_to_ast';

describe('cidrToAst', () => {
  it('should return an expression', () => {
    expect(cidrToAst({ mask: '0.0.0.0/0' })).toHaveProperty('type', 'expression');
  });

  it('should forward arguments', () => {
    expect(cidrToAst({ mask: '0.0.0.0/0' })).toHaveProperty(
      'chain.0.arguments',
      expect.objectContaining({ mask: ['0.0.0.0/0'] })
    );
  });
});
