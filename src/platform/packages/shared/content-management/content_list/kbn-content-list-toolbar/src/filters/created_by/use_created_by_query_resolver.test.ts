/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import { resolveToUids, extractCreatedByFieldValues } from './use_created_by_query_resolver';

describe('resolveToUids', () => {
  const emailToUid = new Map([
    ['jane@elastic.co', 'u_jane'],
    ['bob@elastic.co', 'u_bob'],
    ['managed', '__managed__'],
    ['none', '__no_creator__'],
  ]);

  it('resolves exact email matches', () => {
    const result = resolveToUids(['jane@elastic.co'], emailToUid);
    expect(result).toEqual(['u_jane']);
  });

  it('resolves case-insensitively', () => {
    const result = resolveToUids(['Jane@Elastic.CO'], emailToUid);
    expect(result).toEqual(['u_jane']);
  });

  it('resolves sentinel values', () => {
    const result = resolveToUids(['managed'], emailToUid);
    expect(result).toEqual(['__managed__']);
  });

  it('resolves multiple values', () => {
    const result = resolveToUids(['jane@elastic.co', 'bob@elastic.co'], emailToUid);
    expect(result).toEqual(['u_jane', 'u_bob']);
  });

  it('deduplicates results', () => {
    const result = resolveToUids(['jane@elastic.co', 'jane@elastic.co'], emailToUid);
    expect(result).toEqual(['u_jane']);
  });

  it('skips values with no match', () => {
    const result = resolveToUids(['unknown@example.com'], emailToUid);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = resolveToUids([], emailToUid);
    expect(result).toEqual([]);
  });
});

describe('extractCreatedByFieldValues', () => {
  it('extracts values from simple field clauses', () => {
    const query = Query.parse('createdBy:jane@elastic.co');
    const { includeValues, excludeValues } = extractCreatedByFieldValues(query);

    expect(includeValues).toEqual(['jane@elastic.co']);
    expect(excludeValues).toEqual([]);
  });

  it('extracts values from OR field clauses', () => {
    const query = Query.parse('createdBy:(jane@elastic.co or bob@elastic.co)');
    const { includeValues } = extractCreatedByFieldValues(query);

    expect(includeValues).toContain('jane@elastic.co');
    expect(includeValues).toContain('bob@elastic.co');
  });

  it('extracts sentinel values', () => {
    const query = Query.parse('createdBy:managed');
    const { includeValues } = extractCreatedByFieldValues(query);

    expect(includeValues).toEqual(['managed']);
  });

  it('returns empty arrays when no createdBy clause exists', () => {
    const query = Query.parse('tag:production');
    const { includeValues, excludeValues } = extractCreatedByFieldValues(query);

    expect(includeValues).toEqual([]);
    expect(excludeValues).toEqual([]);
  });

  it('returns empty arrays for empty query', () => {
    const query = Query.parse('');
    const { includeValues, excludeValues } = extractCreatedByFieldValues(query);

    expect(includeValues).toEqual([]);
    expect(excludeValues).toEqual([]);
  });

  it('deduplicates values', () => {
    const query = Query.parse('createdBy:jane@elastic.co createdBy:jane@elastic.co');
    const { includeValues } = extractCreatedByFieldValues(query);

    const unique = new Set(includeValues);
    expect(unique.size).toBe(includeValues.length);
  });
});
