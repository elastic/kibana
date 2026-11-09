/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendToESQLQuery } from '@kbn/esql-utils';
import { appendMapClause, removeWhere } from './latency_map_query_clauses';

const query = 'FROM traces-apm*\n| WHERE service.name == "cart"';
const clause = '@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z") AND (duration >= 1000)';

describe('removeWhere', () => {
  it('takes off a WHERE clause appendToESQLQuery added', () => {
    expect(removeWhere(appendToESQLQuery(query, `| WHERE ${clause}`), clause)).toBe(query);
  });

  it('removes the clause wherever it sits in the query', () => {
    const middle = `FROM traces-apm*\n| WHERE ${clause}\n| WHERE service.name == "cart"`;
    expect(removeWhere(middle, clause)).toBe(query);
  });

  it('leaves a query without the clause as it is', () => {
    const appended = appendToESQLQuery(query, `| WHERE ${clause}`);
    expect(removeWhere(query, clause)).toBe(query);
    expect(removeWhere(appended, clause.replace('duration', 'durationX'))).toBe(appended);
  });
});

describe('appendMapClause', () => {
  it('sets unmapped fields to null once, so a source without a field of the clause still runs', () => {
    const once = appendMapClause(query, clause);
    expect(once).toBe(
      `SET unmapped_fields="NULLIFY";\n${appendToESQLQuery(query, `| WHERE ${clause}`)}`
    );
    expect(
      appendMapClause(once, '(status.code == "Error")').match(/SET unmapped_fields/g)
    ).toHaveLength(1);
  });

  it('leaves a query that already sets it', () => {
    const own = `SET unmapped_fields="LOAD";\n${query}`;
    expect(appendMapClause(own, clause)).toBe(appendToESQLQuery(own, `| WHERE ${clause}`));
  });

  it('removes the clause again', () => {
    expect(removeWhere(appendMapClause(query, clause), clause)).toBe(
      `SET unmapped_fields="NULLIFY";\n${query}`
    );
  });
});
