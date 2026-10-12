/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNonEmptyEsqlQuery } from './is_non_empty_esql_query';

describe('isNonEmptyEsqlQuery', () => {
  it('returns false for an undefined query', () => {
    expect(isNonEmptyEsqlQuery(undefined)).toBe(false);
  });

  it('returns false for a non-ES|QL query', () => {
    expect(isNonEmptyEsqlQuery({ query: 'foo: bar', language: 'kuery' })).toBe(false);
  });

  it('returns false for an empty or whitespace-only ES|QL query', () => {
    expect(isNonEmptyEsqlQuery({ esql: '' })).toBe(false);
    expect(isNonEmptyEsqlQuery({ esql: '   ' })).toBe(false);
  });

  it('returns true for a non-empty ES|QL query', () => {
    expect(isNonEmptyEsqlQuery({ esql: 'FROM logs' })).toBe(true);
  });
});
