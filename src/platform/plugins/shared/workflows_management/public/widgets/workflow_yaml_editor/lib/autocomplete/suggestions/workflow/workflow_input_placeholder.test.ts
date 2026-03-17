/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPlaceholderForProperty } from './workflow_input_placeholder';

describe('getPlaceholderForProperty', () => {
  it('wraps string samples in double quotes', () => {
    expect(getPlaceholderForProperty({ type: 'string' })).toBe('"string"');
  });

  it('wraps email-format strings in double quotes', () => {
    expect(getPlaceholderForProperty({ type: 'string', format: 'email' })).toBe(
      '"user@example.com"'
    );
  });

  it('returns numeric value as JSON', () => {
    expect(getPlaceholderForProperty({ type: 'number' })).toBe('0');
  });

  it('returns boolean value as JSON', () => {
    expect(getPlaceholderForProperty({ type: 'boolean' })).toBe('false');
  });

  it('uses schema default when present', () => {
    expect(getPlaceholderForProperty({ type: 'string', default: 'hello' })).toBe('"hello"');
  });

  it('returns empty string in quotes for unknown type', () => {
    expect(getPlaceholderForProperty({})).toBe('""');
  });

  it('handles array type', () => {
    expect(getPlaceholderForProperty({ type: 'array', items: { type: 'string' } })).toBe(
      '["string"]'
    );
  });

  it('handles object type with required properties', () => {
    const result = getPlaceholderForProperty({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    expect(result).toBe('{"name":"string"}');
  });
});
