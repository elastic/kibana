/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidId } from './is_valid_id';

describe('isValidId', () => {
  it('should accept a simple alphanumeric ID', () => {
    expect(isValidId('workflow-1')).toBe(true);
  });

  it('should accept IDs with hyphens', () => {
    expect(isValidId('my-workflow-v2-beta')).toBe(true);
  });

  it('should accept an ID of exactly 255 characters', () => {
    const id = `a${'b'.repeat(254)}`;
    expect(id).toHaveLength(255);
    expect(isValidId(id)).toBe(true);
  });

  it('should reject an empty string', () => {
    expect(isValidId('')).toBe(false);
  });

  it('should reject an ID starting with a dot', () => {
    expect(isValidId('.hidden')).toBe(false);
  });

  it('should reject an ID starting with a hyphen', () => {
    expect(isValidId('-dashed')).toBe(false);
  });

  it('should reject an ID starting with an underscore', () => {
    expect(isValidId('_private')).toBe(false);
  });

  it('should reject an ID exceeding 255 characters', () => {
    const id = 'a'.repeat(256);
    expect(isValidId(id)).toBe(false);
  });

  it('should reject __proto__ (prototype pollution)', () => {
    expect(isValidId('__proto__')).toBe(false);
  });

  it('should reject constructor (prototype pollution)', () => {
    expect(isValidId('constructor')).toBe(false);
  });

  it('should reject prototype (prototype pollution)', () => {
    expect(isValidId('prototype')).toBe(false);
  });

  it('should reject IDs with spaces', () => {
    expect(isValidId('my workflow')).toBe(false);
  });

  it('should reject IDs with special characters', () => {
    expect(isValidId('workflow@1')).toBe(false);
    expect(isValidId('workflow#1')).toBe(false);
    expect(isValidId('workflow!1')).toBe(false);
  });

  it('should not check domain-specific reserved prefixes', () => {
    expect(isValidId('system-foo')).toBe(true);
    expect(isValidId('internal-bar')).toBe(true);
  });

  it('should respect a custom maxLength', () => {
    expect(isValidId('a'.repeat(37), 36)).toBe(false);
    expect(isValidId('a'.repeat(36), 36)).toBe(true);
  });

  it('should respect a custom minLength', () => {
    expect(isValidId('ab', 255, 3)).toBe(false);
    expect(isValidId('ab', 255, 1)).toBe(true);
  });
});
