/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coerceValue } from './coerce_value';
import type { OpenApiDocument } from './types';

const document: OpenApiDocument = { openapi: '3.1.0', info: { title: 'Test', version: '1' } };

describe('coerceValue', () => {
  it('converts text to the scalar type the schema expects', () => {
    expect(coerceValue('10', { type: 'integer' }, document)).toBe(10);
    expect(coerceValue('true', { type: 'boolean' }, document)).toBe(true);
    expect(coerceValue('10', { type: 'string' }, document)).toBe('10');
    expect(coerceValue('ten', { type: 'integer' }, document)).toBe('ten');
  });

  it('keeps numeric text as a string when a string variant accepts it, and converts it otherwise', () => {
    const duration = {
      oneOf: [{ type: 'string', pattern: '^[0-9]+[smhdwy]$' }, { type: 'number' }],
    };
    expect(coerceValue('30', duration, document)).toBe(30);
    expect(coerceValue('15s', duration, document)).toBe('15s');

    const timestamp = { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'number' }] };
    expect(coerceValue('1700000000', timestamp, document)).toBe(1700000000);

    const anyText = { type: ['string', 'integer'] };
    expect(coerceValue('42', anyText, document)).toBe('42');
  });
});
