/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOptionsListSearchFilter } from './search_filter';

describe('getOptionsListSearchFilter', () => {
  const string = { name: 'host', type: 'string' };
  const search = (
    fieldSpec: { name: string; type: string },
    searchString: string | undefined,
    searchTechnique?: 'exact' | 'prefix' | 'wildcard'
  ) =>
    getOptionsListSearchFilter({
      fieldName: fieldSpec.name,
      fieldSpec: { ...fieldSpec, searchable: true, aggregatable: true },
      searchString,
      searchTechnique,
    });

  it('has nothing to filter without a search string', () => {
    expect(search(string, '', 'prefix')).toBeUndefined();
    expect(search(string, undefined, 'prefix')).toBeUndefined();
  });

  describe('string field', () => {
    it('keeps the values that start with the search, whatever its case', () => {
      expect(search(string, 'Ma', 'prefix')).toEqual({
        prefix: { host: { value: 'Ma', case_insensitive: true } },
      });
    });

    it('keeps the values that contain the search, with its wildcard characters escaped', () => {
      expect(search(string, 'a*b?c', 'wildcard')).toEqual({
        wildcard: { host: { value: '*a\\*b\\?c*', case_insensitive: true } },
      });
    });

    it('keeps the values that are the search, whatever its case', () => {
      expect(search(string, 'Mainframe', 'exact')).toEqual({
        term: { host: { value: 'Mainframe', case_insensitive: true } },
      });
    });

    it('searches by prefix when there is no technique', () => {
      expect(search(string, 'ma')).toEqual({
        prefix: { host: { value: 'ma', case_insensitive: true } },
      });
    });
  });

  describe('number field', () => {
    const bytes = { name: 'bytes', type: 'number' };

    it('keeps the values that are the number', () => {
      expect(search(bytes, '12', 'exact')).toEqual({
        term: { bytes: { value: '12', case_insensitive: false } },
      });
    });

    it('has no filter for a search that is not a number', () => {
      expect(search(bytes, 'abc', 'exact')).toBeUndefined();
    });
  });

  describe('ip field', () => {
    const ip = { name: 'client', type: 'ip' };

    it('keeps the addresses of a partial ip, as the ranges that it covers', () => {
      const filter = search(ip, '192.168', 'prefix');

      expect(filter).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [{ range: { client: { gte: '192.168.0.0', lte: '192.168.255.255' } } }],
        },
      });
    });

    it('keeps the addresses of a cidr range', () => {
      expect(search(ip, '10.0.0.0/8', 'prefix')).toEqual({
        bool: { minimum_should_match: 1, should: [{ term: { client: '10.0.0.0/8' } }] },
      });
    });

    it('has no filter for a search that is not an ip', () => {
      expect(search(ip, 'zzz', 'prefix')).toBeUndefined();
    });
  });

  it('has no filter for a date field, which is not searchable', () => {
    expect(search({ name: 'day', type: 'date' }, '2024', 'exact')).toBeUndefined();
  });
});
