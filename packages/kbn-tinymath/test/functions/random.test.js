/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { random } = require('../../src/functions/random');

describe('Random', () => {
  it('numbers', () => {
    const random1 = random();
    expect(random1).toBeGreaterThanOrEqual(0);
    expect(random1).toBeLessThan(1);
    expect(random(0)).toEqual(0);
    const random3 = random(3);
    expect(random3).toBeGreaterThanOrEqual(0);
    expect(random3).toBeLessThan(3);
    const random100 = random(-100, 100);
    expect(random100).toBeGreaterThanOrEqual(-100);
    expect(random100).toBeLessThan(100);
    expect(random(1, 1)).toEqual(1);
    expect(random(100, 100)).toEqual(100);
  });

  it('min greater than max', () => {
    expect(() => random(-1)).toThrow('Min is greater than max');
    expect(() => random(3, 1)).toThrow('Min is greater than max');
  });
});
