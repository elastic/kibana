/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isCompressed } from './is_compressed';

describe('isCompressed', () => {
  test('should return true by default', () => {
    const mockApi = {};
    expect(isCompressed(mockApi)).toBe(true);
  });
  test('should return false if compressed is false', () => {
    const mockApi = { compressed: false };
    expect(isCompressed(mockApi)).toBe(false);
  });
  test('should return false if parent api has compressed false', () => {
    const mockApi = { parentApi: { compressed: false } };
    expect(isCompressed(mockApi)).toBe(false);
  });
  test('should return false if nested api has compressed false', () => {
    const mockApi = { parentApi: { parentApi: { parentApi: { compressed: false } } } };
    expect(isCompressed(mockApi)).toBe(false);
  });
  test('should return true if parent api does not specify compressed', () => {
    const mockApi = { parentApi: { parentApi: {} } };
    expect(isCompressed(mockApi)).toBe(true);
  });
});
