/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asPrettyString } from './as_pretty_string';

describe('asPrettyString', () => {
  test('Converts null and undefined values into a string signifying no value', () => {
    expect(asPrettyString(null)).toBe(' - ');
    expect(asPrettyString(undefined)).toBe(' - ');
  });

  test('Does not mutate string values', () => {
    const s = 'I am a string!@';
    expect(asPrettyString(s)).toBe(s);
  });

  test('Converts objects values into presentable strings', () => {
    expect(asPrettyString({ key: 'value' })).toBe('{\n  "key": "value"\n}');
    expect(asPrettyString({ key: 'value' }, { skipFormattingInStringifiedJSON: true })).toBe(
      '{"key":"value"}'
    );
  });

  test('Converts other non-string values into strings', () => {
    expect(asPrettyString(true)).toBe('true');
    expect(asPrettyString(123)).toBe('123');
  });

  test('Converts Symbol into strings', () => {
    expect(asPrettyString(Symbol('hello'))).toBe('Symbol(hello)');
  });
});
