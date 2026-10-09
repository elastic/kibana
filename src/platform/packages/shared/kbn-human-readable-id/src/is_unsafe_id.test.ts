/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUnsafeId } from './is_unsafe_id';

describe('isUnsafeId', () => {
  it('should reject __proto__', () => {
    expect(isUnsafeId('__proto__')).toBe(true);
  });

  it('should reject constructor', () => {
    expect(isUnsafeId('constructor')).toBe(true);
  });

  it('should reject prototype', () => {
    expect(isUnsafeId('prototype')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isUnsafeId('')).toBe(true);
  });

  it('should reject IDs exceeding default max length (255)', () => {
    expect(isUnsafeId('a'.repeat(256))).toBe(true);
  });

  it('should reject IDs exceeding a custom max length', () => {
    expect(isUnsafeId('a'.repeat(37), 36)).toBe(true);
  });

  it('should accept IDs within a custom max length', () => {
    expect(isUnsafeId('a'.repeat(36), 36)).toBe(false);
  });

  it('should reject IDs containing path traversal (..)', () => {
    expect(isUnsafeId('..%2fetc%2fpasswd')).toBe(true);
    expect(isUnsafeId('../etc/passwd')).toBe(true);
  });

  it('should reject IDs containing forward slashes', () => {
    expect(isUnsafeId('path/to/file')).toBe(true);
  });

  it('should accept a normal ID with uppercase and underscores', () => {
    expect(isUnsafeId('My_Workflow')).toBe(false);
  });
});
