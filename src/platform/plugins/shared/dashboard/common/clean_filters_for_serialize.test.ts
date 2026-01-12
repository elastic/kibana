/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { cleanFiltersForSerialize } from './clean_filters_for_serialize';
import type { DashboardFilter } from '../server';

describe('cleanFiltersForSerialize', () => {
  test('should return undefined if filters is not provided', () => {
    expect(cleanFiltersForSerialize()).toBeUndefined();
  });

  test('should remove "meta.value" property from each filter', () => {
    const filters: Filter[] = [
      { query: { a: 'a' }, meta: { value: 'value1' } },
      { query: { b: 'b' }, meta: { value: undefined } },
    ];

    const cleanedFilters = cleanFiltersForSerialize(filters) as DashboardFilter[];

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should remove undefined "meta.key" property from each filter', () => {
    const filters: Filter[] = [
      { query: { a: 'a' }, meta: { key: undefined } },
      { query: { b: 'b' }, meta: { key: undefined } },
    ];

    const cleanedFilters = cleanFiltersForSerialize(filters) as DashboardFilter[];

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should remove undefined "meta.alias" property from each filter', () => {
    const filters: Filter[] = [
      { query: { a: 'a' }, meta: { alias: undefined } },
      { query: { b: 'b' }, meta: { alias: undefined } },
    ];

    const cleanedFilters = cleanFiltersForSerialize(filters) as DashboardFilter[];

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should remove undefined "meta.key", "meta.alias", and "meta.value" properties from nested compound filters', () => {
    const filters: Filter[] = [
      {
        meta: {
          params: [
            { query: { a: 'a' }, meta: { value: undefined, key: undefined, alias: undefined } },
            { query: { b: 'b' }, meta: { value: undefined, key: undefined, alias: undefined } },
          ],
        },
      },
    ];

    const cleanedFilters = cleanFiltersForSerialize(filters) as DashboardFilter[];

    expect(cleanedFilters[0]).toEqual({
      meta: {
        params: [
          { query: { a: 'a' }, meta: {} },
          { query: { b: 'b' }, meta: {} },
        ],
      },
    });
  });

  test('should not fail if meta is missing from filters', () => {
    const filters: Filter[] = [{ query: { a: 'a' } }, { query: { b: 'b' } }] as unknown as Filter[];

    const cleanedFilters = cleanFiltersForSerialize(
      filters as unknown as Filter[]
    ) as DashboardFilter[];

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' } });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' } });
  });
});
