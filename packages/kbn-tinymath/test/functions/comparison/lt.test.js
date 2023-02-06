/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { lt } = require('../../../src/functions/comparison/lt');

describe('Lt', () => {
  it('missing args', () => {
    expect(() => lt()).toThrow();
    expect(() => lt(-10)).toThrow();
    expect(() => lt([])).toThrow();
  });

  it('empty arrays', () => {
    expect(lt([], [])).toBeTruthy();
  });

  it('numbers', () => {
    expect(lt(-10, -2)).toBeTruthy();
    expect(lt(10, 20)).toBeTruthy();
    expect(lt(0, 1)).toBeTruthy();
  });

  it('arrays', () => {
    // Should pass
    expect(lt([-1], 0)).toBeTruthy();
    expect(lt([-1], [0])).toBeTruthy();
    expect(lt([-1, -1], 0)).toBeTruthy();
    expect(lt([-1, -1], [0, 0])).toBeTruthy();

    // Should not pass
    expect(lt([-1], -2)).toBeFalsy();
    expect(lt([-1], [-2])).toBeFalsy();
    expect(lt([-1, -1], -2)).toBeFalsy();
    expect(lt([-1, -1], [-2, -2])).toBeFalsy();
    expect(lt([-1, -1], [-2, 2])).toBeFalsy();
  });
});
