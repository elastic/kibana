/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateShortId, generateLongId, generateLongIdWithSeed } from './generate_id';

describe('generate_id', () => {
  it('should generate a short id of the correct length', () => {
    const shortId = generateShortId();
    expect(shortId.length).toBe(16);
  });

  it('should generate a long id of the correct length', () => {
    const longId = generateLongId();
    expect(longId.length).toBe(32);
  });

  it('should generate a long id with a seed and correct padding', () => {
    const seed = 'order/123';
    const longIdWithSeed = generateLongIdWithSeed(seed);
    expect(longIdWithSeed.length).toBe(32);
    expect(longIdWithSeed).toBe(seed.replace(/[/]/g, '_').replace(/[{}]/g, '').padStart(32, '0'));
  });
});
