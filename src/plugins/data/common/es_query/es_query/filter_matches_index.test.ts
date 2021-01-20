/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter } from '../filters';
import { filterMatchesIndex } from './filter_matches_index';
import { IIndexPattern } from '../../index_patterns';

describe('filterMatchesIndex', () => {
  it('should return true if the filter has no meta', () => {
    const filter = {} as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as IIndexPattern;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });

  it('should return true if no index pattern is passed', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } } as Filter;

    expect(filterMatchesIndex(filter, undefined)).toBe(true);
  });

  it('should return true if the filter key matches a field name', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as IIndexPattern;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });

  it('should return false if the filter key does not match a field name', () => {
    const filter = { meta: { index: 'foo', key: 'baz' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as IIndexPattern;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(false);
  });

  it('should return true if the filter has meta without a key', () => {
    const filter = { meta: { index: 'foo' } } as Filter;
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] } as IIndexPattern;

    expect(filterMatchesIndex(filter, indexPattern)).toBe(true);
  });
});
