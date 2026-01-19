/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasAnyFieldWithPrefixes } from './has_any_field_with_prefixes';
import type { DataTableRecord } from '@kbn/discover-utils';

describe('hasAnyFieldWithPrefixes', () => {
  const makeRecord = (flattened: Record<string, unknown>): DataTableRecord =>
    ({ flattened } as DataTableRecord);

  it('returns true if any prefix matches a non-null field', () => {
    const record = makeRecord({
      'foo.bar': null,
      'baz.qux': 42,
      other: 'value',
    });
    const fn = hasAnyFieldWithPrefixes(['foo.', 'other']);
    expect(fn(record)).toBe(true);
  });

  it('returns false if any suffix matches a non-null field', () => {
    const record = makeRecord({
      'foo.bar.qux': null,
      'baz.bar.qux.': 42,
      other: 'value',
    });
    const fn = hasAnyFieldWithPrefixes(['bar.quax']);
    expect(fn(record)).toBe(false);
  });

  it('returns false if no keys in flattened object', () => {
    const record = makeRecord({});
    const fn = hasAnyFieldWithPrefixes(['foo.', 'bar.']);
    expect(fn(record)).toBe(false);
  });

  it('returns false if prefixes array is empty', () => {
    const record = makeRecord({
      'foo.bar': 1,
      'baz.qux': 2,
    });
    const fn = hasAnyFieldWithPrefixes([]);
    expect(fn(record)).toBe(false);
  });

  it('returns false if prefix is an empty string and all fields are null/undefined', () => {
    const record = makeRecord({
      'foo.bar': null,
      'baz.qux': undefined,
    });
    const fn = hasAnyFieldWithPrefixes(['']);
    expect(fn(record)).toBe(false);
  });

  it('returns true if prefix is an empty string and any field is non-null', () => {
    const record = makeRecord({
      'foo.bar': 1,
      'baz.qux': null,
    });
    const fn = hasAnyFieldWithPrefixes(['']);
    expect(fn(record)).toBe(true);
  });
  it('returns true if a field with a prefix exists and its value is 0', () => {
    const record = makeRecord({
      'foo.bar': 0,
      'baz.qux': null,
    });
    const fn = hasAnyFieldWithPrefixes(['foo.']);
    expect(fn(record)).toBe(true);
  });

  it('returns true if a field with a prefix  exists and its value is false', () => {
    const record = makeRecord({
      'foo.bar': false,
      'baz.qux': null,
    });
    const fn = hasAnyFieldWithPrefixes(['foo.']);
    expect(fn(record)).toBe(true);
  });

  it('returns true if a field with a prefix exists and its value is an empty string', () => {
    const record = makeRecord({
      'foo.bar': '',
      'baz.qux': null,
    });
    const fn = hasAnyFieldWithPrefixes(['foo.']);
    expect(fn(record)).toBe(true);
  });
});
