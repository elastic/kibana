/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateTestRunId, computeTestID } from './test_id_generator';
import path from 'node:path';

describe('generateTestRunId', () => {
  it("generates random 16 char string every time it's called", () => {
    const hashes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const hash = generateTestRunId();
      expect(hash).toHaveLength(16);
      expect(hashes.includes(hash)).toBeFalsy();
      hashes.push(hash);
    }
  });
});

describe('computeTestID', () => {
  it('returns the same output every time if the inputs are the same', () => {
    const getTestID = () => computeTestID(path.join('some_functionality.spec.ts'), test.name);
    const expectedTestId = '5895f3c6f599ba8-9f86d081884c7d6'; // hard-coded to detect any changes in hash calculations
    const testID = getTestID();

    expect(testID).toEqual(expectedTestId);
    expect(getTestID()).toEqual(testID);
  });

  it('output is two 15 char hashes joined by a dash', () => {
    expect(computeTestID('foo/bar', 'baz bat')).toMatch(/\w{15}-\w{15}/);
  });

  it("doesn't accept zero-length inputs", () => {
    expect(() => computeTestID('some/path', '')).toThrow();
    expect(() => computeTestID('', 'some test title')).toThrow();
  });
});
