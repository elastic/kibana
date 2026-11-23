/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILTERS, type Filter } from '@kbn/es-query';
import { appendEsqlFiltersToESQLQuery } from './append_esql_filters';

const query =
  'FROM logs | EVAL size = CASE(bytes > 100, "big", "small") | STATS requests = COUNT(*) BY size';

// like the filters of the pills, the value is in the params and in the query
const getFilter = (meta: Partial<Filter['meta']> = {}): Filter => {
  const key = meta.key ?? 'size';
  const params = meta.params ?? { query: 'big' };
  return {
    meta: { kind: 'esql', type: FILTERS.PHRASE, ...meta, key, params },
    query: { match_phrase: { [key]: (params as { query?: unknown }).query } },
  };
};

describe('appendEsqlFiltersToESQLQuery', () => {
  it('appends a WHERE at the end of the queries that have the column', async () => {
    expect(await appendEsqlFiltersToESQLQuery(query, [getFilter()])).toBe(
      `${query}\n| WHERE \`size\` == "big"`
    );
  });

  it('negates the filter', async () => {
    expect(await appendEsqlFiltersToESQLQuery(query, [getFilter({ negate: true })])).toBe(
      `${query}\n| WHERE (\`size\` IS NULL OR NOT (\`size\` == "big"))`
    );
  });

  it('does not cast the column, so numbers and booleans can be compared', async () => {
    const numeric = getFilter({ key: 'requests', params: { query: 8037.66 } });
    const bool = getFilter({ key: 'requests', params: { query: true } });

    expect(await appendEsqlFiltersToESQLQuery(query, [numeric])).toMatch(
      /WHERE `requests` == 8037.66$/
    );
    expect(await appendEsqlFiltersToESQLQuery(query, [bool])).toMatch(/WHERE `requests` == true$/);
  });

  it('supports several values of a multivalued column', async () => {
    const filter = getFilter({ type: FILTERS.PHRASES, params: ['big', 'small'] });

    expect(await appendEsqlFiltersToESQLQuery(query, [filter])).toMatch(
      /WHERE MV_CONTAINS\(`size`, \["big", "small"\]\)$/
    );
  });

  it('adds the WHERE before the SORT and LIMIT that end the query, so the LIMIT keeps the rows that match', async () => {
    const withTrailingCommands = `${query} | SORT requests DESC | LIMIT 10`;

    expect(await appendEsqlFiltersToESQLQuery(withTrailingCommands, [getFilter()])).toBe(
      `${query}\n| WHERE \`size\` == "big" | SORT requests DESC | LIMIT 10`
    );
  });

  it('does not change a query with syntax errors, Elasticsearch reports them', async () => {
    const invalid = 'FROM logs | EVAL size = | STATS';

    expect(await appendEsqlFiltersToESQLQuery(invalid, [getFilter()])).toBe(invalid);
  });

  it('supports exists filters', async () => {
    const exists = {
      ...getFilter({ type: FILTERS.EXISTS, params: undefined }),
      query: { exists: { field: 'size' } },
    };

    expect(await appendEsqlFiltersToESQLQuery(query, [exists])).toMatch(
      /WHERE `size` IS NOT NULL$/
    );
    expect(
      await appendEsqlFiltersToESQLQuery(query, [
        { ...exists, meta: { ...exists.meta, negate: true } },
      ])
    ).toMatch(/WHERE `size` IS NULL$/);
  });

  it('ignores the filters of columns that the query does not output', async () => {
    expect(await appendEsqlFiltersToESQLQuery(query, [getFilter({ key: 'other' })])).toBe(query);
    // STATS does not output the column of EVAL
    const withoutColumn = 'FROM logs | EVAL size = 1 | STATS c = COUNT(*)';
    expect(await appendEsqlFiltersToESQLQuery(withoutColumn, [getFilter()])).toBe(withoutColumn);
  });

  it('ignores disabled filters and the ones that are not ES|QL ones', async () => {
    expect(await appendEsqlFiltersToESQLQuery(query, [getFilter({ disabled: true })])).toBe(query);
    expect(await appendEsqlFiltersToESQLQuery(query, [getFilter({ kind: undefined })])).toBe(query);
  });

  it('applies several filters', async () => {
    const result = await appendEsqlFiltersToESQLQuery(query, [
      getFilter(),
      getFilter({ key: 'requests', params: { query: 3 } }),
    ]);

    expect(result).toMatch(/WHERE `size` == "big" AND `requests` == 3$/);
  });
});
