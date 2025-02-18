/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOriginalId, getTransposeId, isTransposeId } from '.';

describe('transpose utils', () => {
  it('should covert value and id to transposed id', () => {
    expect(getTransposeId('test', 'column-1')).toBe('test---column-1');
  });

  it('should know if id is transposed', () => {
    const testId = getTransposeId('test', 'column-1');
    expect(isTransposeId(testId)).toBe(true);
  });

  it('should know if id is not transposed', () => {
    expect(isTransposeId('test')).toBe(false);
  });

  it('should return id for transposed id', () => {
    const testId = getTransposeId('test', 'column-1');

    expect(getOriginalId(testId)).toBe('column-1');
  });

  it('should return id for non-transposed id', () => {
    expect(getOriginalId('test')).toBe('test');
  });
});
