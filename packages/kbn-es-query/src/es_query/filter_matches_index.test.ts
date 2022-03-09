/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '../filters';
import { filterMatchesIndex } from './filter_matches_index';
import { DataViewBase } from './types';

describe('filterMatchesIndex', () => {
  it('should return true if the filter has no meta', () => {
    const filter = {} as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });

  it('should return true if no index pattern is passed', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } } as Filter;

    expect(filterMatchesIndex(filter, undefined)).toBe(true);
  });

  it('should return true if the filter key matches a field name', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });

  it('should return true if custom filter for the same index is passed', () => {
    const filter = { meta: { index: 'foo', key: 'bar', type: 'custom' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bara' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });

  it('should return false if custom filter for a different index is passed', () => {
    const filter = { meta: { index: 'foo', key: 'bar', type: 'custom' } } as Filter;
    const indexPattern = { id: 'food', fields: [{ name: 'bara' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(false);
  });

  it('should return false if the filter key does not match a field name', () => {
    const filter = { meta: { index: 'foo', key: 'baz' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(false);
  });

  it('should return true if the filter has meta without a key', () => {
    const filter = { meta: { index: 'foo' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as DataViewBase;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });
});
