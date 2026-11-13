/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTERS, type Filter } from '@kbn/es-query';
import { applyEsqlFilters } from './apply_esql_filters';

const query =
  'FROM logs | EVAL size = CASE(bytes > 100, "big", "small") | STATS requests = COUNT(*) BY size';

const getFilter = (meta: Partial<Filter['meta']>): Filter => ({
  meta: {
    esql: { type: 'string', esType: 'keyword' },
    key: 'size',
    type: FILTERS.PHRASE,
    params: { query: 'big' },
    ...meta,
  },
  query: { match_phrase: { size: 'big' } },
});

describe('applyEsqlFilters', () => {
  it('appends a WHERE to the queries that have the column', () => {
    const result = applyEsqlFilters(query, [getFilter({})]);

    expect(result.startsWith(`${query}\n| WHERE `)).toBe(true);
    expect(result).toMatch(/`size` == "big"/);
  });

  it('negates the filter', () => {
    expect(applyEsqlFilters(query, [getFilter({ negate: true })])).toContain('!=');
  });

  it('compares numeric and boolean columns without casting them to string', () => {
    const numeric = getFilter({
      key: 'requests',
      esql: { type: 'number', esType: 'double' },
      params: { query: 8037.66 },
    });
    const bool = getFilter({
      key: 'requests',
      esql: { type: 'boolean', esType: 'boolean' },
      params: { query: true },
    });

    expect(applyEsqlFilters(query, [numeric])).toMatch(/WHERE `requests` == 8037.66$/);
    expect(applyEsqlFilters(query, [bool])).toMatch(/WHERE `requests` == true$/);
  });

  it('supports several values with MV_CONTAINS, using the type of the column', () => {
    const filter = getFilter({ type: FILTERS.PHRASES, params: ['big', 'small'] });

    expect(applyEsqlFilters(query, [filter])).toMatch(
      /WHERE MV_CONTAINS\(`size`, \["big", "small"\]::keyword\)$/
    );
    expect(
      applyEsqlFilters(query, [{ ...filter, meta: { ...filter.meta, negate: true } }])
    ).toMatch(/WHERE NOT MV_CONTAINS\(`size`, \["big", "small"\]::keyword\)$/);
  });

  it('supports exists filters', () => {
    const exists = getFilter({ type: FILTERS.EXISTS, params: undefined });

    expect(applyEsqlFilters(query, [exists])).toMatch(/WHERE .*IS NOT NULL/i);
    expect(
      applyEsqlFilters(query, [{ ...exists, meta: { ...exists.meta, negate: true } }])
    ).toMatch(/WHERE .*IS NULL/i);
  });

  it('ignores the queries that do not have the column', () => {
    expect(applyEsqlFilters(query, [getFilter({ key: 'other' })])).toBe(query);
    expect(
      applyEsqlFilters('FROM logs | EVAL size = 1 | STATS c = COUNT(*)', [getFilter({})])
    ).toBe('FROM logs | EVAL size = 1 | STATS c = COUNT(*)');
  });

  it('ignores disabled and DSL filters', () => {
    expect(applyEsqlFilters(query, [getFilter({ disabled: true })])).toBe(query);
    expect(applyEsqlFilters(query, [getFilter({ esql: undefined })])).toBe(query);
  });

  it('applies several filters', () => {
    const result = applyEsqlFilters(query, [
      getFilter({}),
      getFilter({ key: 'requests', params: { query: 3 } }),
    ]);

    expect(result).toContain('size');
    expect(result).toContain('requests');
  });
});
