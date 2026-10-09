/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from './token';

describe('createToken', () => {
  it('returns the same symbol as Symbol.for with the same id', () => {
    expect(createToken('test.Token')).toBe(Symbol.for('test.Token'));
  });

  it('returns an identical reference on subsequent calls with the same id', () => {
    expect(createToken('test.Token')).toBe(createToken('test.Token'));
  });

  it('returns distinct tokens for different ids', () => {
    expect(createToken('test.TokenA')).not.toBe(createToken('test.TokenB'));
  });
});
