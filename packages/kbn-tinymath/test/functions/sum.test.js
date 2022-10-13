/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { sum } = require('../../src/functions/sum');

describe('Sum', () => {
  it('numbers', () => {
    expect(sum(10, 2, 5, 8)).toEqual(25);
    expect(sum(0.1, 0.2, 0.4, 0.3)).toEqual(0.1 + 0.2 + 0.3 + 0.4);
  });

  it('arrays & numbers', () => {
    expect(sum([10, 20, 30, 40], 10, 20, 30)).toEqual(160);
    expect(sum([10, 20, 30, 40], 10, [1, 2, 3], 22)).toEqual(138);
  });

  it('arrays', () => {
    expect(sum([1, 2, 3, 4], [1, 2, 5, 10])).toEqual(28);
    expect(sum([1, 2, 3, 4], [1, 2, 5, 10], [10, 20, 30, 40])).toEqual(128);
    expect(sum([11, 48, 60, 72], [1, 2, 3, 4])).toEqual(201);
  });
});
