/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendToESQLQuery } from '@kbn/esql-utils';
import { FAILED_SPAN_CONDITION, selectionToEsqlCondition } from '@kbn/trace-latency-map';
import { appendMapClause, removeMapSetResidue, removeWhere } from './latency_map_query_clauses';

const query = 'FROM traces-apm*\n| WHERE service.name == "cart"';
const clause = '@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z") AND (duration >= 1000)';
const selectionClause = selectionToEsqlCondition({
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDuration: 1_000_000,
  maxDuration: 5_000_000,
});

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

describe('removeMapSetResidue', () => {
  it('takes the SET back off once the last map clause is gone, restoring the query exactly', () => {
    const appended = appendMapClause(query, selectionClause);
    expect(removeMapSetResidue(removeWhere(appended, selectionClause))).toBe(query);
  });

  it('keeps the SET while another map clause still needs it', () => {
    const both = appendMapClause(appendMapClause(query, selectionClause), FAILED_SPAN_CONDITION);
    const withoutSelection = removeWhere(both, selectionClause);
    expect(removeMapSetResidue(withoutSelection)).toBe(withoutSelection);
  });

  it('never touches a SET the user wrote, with or without map clauses', () => {
    const own = `SET unmapped_fields="LOAD";\n${query}`;
    expect(removeMapSetResidue(own)).toBe(own);
    // Same value but the user's own spacing: not the exact prefix the map writes.
    const ownNullify = `SET unmapped_fields="NULLIFY"; ${query}`;
    expect(removeMapSetResidue(ownNullify)).toBe(ownNullify);
  });
});
