/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { querySchema } from './query';

describe('querySchema', () => {
  test('handles language with a correct type', () => {
    const type = querySchema(['kql', 'lucene']);
    expect(type.validate({ language: 'kql', query: 'bar' })).toEqual({
      language: 'kql',
      query: 'bar',
    });
  });

  test('allows any string when no supported languages are provided', () => {
    const type = querySchema();
    expect(type.validate({ language: 'any-language', query: 'bar' })).toEqual({
      language: 'any-language',
      query: 'bar',
    });
  });

  test('handles language with a wrong type', () => {
    const type = querySchema(['kql', 'lucene']);
    expect(() => type.validate({ language: 'foo', query: 'bar' }))
      .toThrowErrorMatchingInlineSnapshot(`
      "[language]: types that failed validation:
      - [language.0]: expected value to equal [kql]
      - [language.1]: expected value to equal [lucene]"
    `);
  });
});
