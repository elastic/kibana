/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { ifelse } = require('../../../src/functions/comparison/ifelse');

describe('Ifelse', () => {
  it('should basically work', () => {
    expect(ifelse(true, 1, 0)).toEqual(1);
    expect(ifelse(false, 1, 0)).toEqual(0);
    expect(ifelse(1 > 0, 1, 0)).toEqual(1);
    expect(ifelse(1 < 0, 1, 0)).toEqual(0);
  });

  it('should throw if cond is not of boolean type', () => {
    expect(() => ifelse(5, 1, 0)).toThrow('Condition clause is of the wrong type');
    expect(() => ifelse(null, 1, 0)).toThrow('Condition clause is of the wrong type');
    expect(() => ifelse(undefined, 1, 0)).toThrow('Condition clause is of the wrong type');
    expect(() => ifelse(0, 1, 0)).toThrow('Condition clause is of the wrong type');
  });

  it('missing args', () => {
    expect(() => ifelse()).toThrow();
    expect(() => ifelse(-10)).toThrow();
    expect(() => ifelse([])).toThrow();
    expect(() => ifelse(true)).toThrow();
    expect(() => ifelse(true, 1)).toThrow();
  });
});
