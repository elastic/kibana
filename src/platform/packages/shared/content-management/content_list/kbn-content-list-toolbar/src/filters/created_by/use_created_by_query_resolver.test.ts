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
    const { resolved, unresolved } = resolveToUids(['jane@elastic.co'], emailToUid);
    expect(resolved).toEqual(['u_jane']);
    expect(unresolved).toEqual([]);
  });

  it('resolves case-insensitively', () => {
    const { resolved, unresolved } = resolveToUids(['Jane@Elastic.CO'], emailToUid);
    expect(resolved).toEqual(['u_jane']);
    expect(unresolved).toEqual([]);
  });

  it('resolves sentinel values', () => {
    const { resolved, unresolved } = resolveToUids(['managed'], emailToUid);
    expect(resolved).toEqual(['__managed__']);
    expect(unresolved).toEqual([]);
  });

  it('resolves multiple values', () => {
    const { resolved, unresolved } = resolveToUids(
      ['jane@elastic.co', 'bob@elastic.co'],
      emailToUid
    );
    expect(resolved).toEqual(['u_jane', 'u_bob']);
    expect(unresolved).toEqual([]);
  });

  it('deduplicates resolved results', () => {
    const { resolved } = resolveToUids(['jane@elastic.co', 'jane@elastic.co'], emailToUid);
    expect(resolved).toEqual(['u_jane']);
  });

  it('returns unresolved values that have no match', () => {
    const { resolved, unresolved } = resolveToUids(['unknown@example.com'], emailToUid);
    expect(resolved).toEqual([]);
    expect(unresolved).toEqual(['unknown@example.com']);
  });

  it('splits mixed input into resolved and unresolved', () => {
    const { resolved, unresolved } = resolveToUids(
      ['jane@elastic.co', 'unknown@example.com'],
      emailToUid
    );
    expect(resolved).toEqual(['u_jane']);
    expect(unresolved).toEqual(['unknown@example.com']);
  });

  it('returns empty arrays for empty input', () => {
    const { resolved, unresolved } = resolveToUids([], emailToUid);
    expect(resolved).toEqual([]);
    expect(unresolved).toEqual([]);
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
