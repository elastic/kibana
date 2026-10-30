/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendWhere, removeWhere } from './latency_map_query_clauses';

const query = 'FROM traces-apm*\n| WHERE service.name == "cart"';
const clause = '@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z") AND (duration >= 1000)';

describe('appendWhere / removeWhere', () => {
  it('appends a WHERE clause removeWhere takes off again', () => {
    expect(removeWhere(appendWhere(query, clause), clause)).toBe(query);
  });

  it('removes the clause wherever it sits in the query', () => {
    const middle = `FROM traces-apm*\n| WHERE ${clause}\n| WHERE service.name == "cart"`;
    expect(removeWhere(middle, clause)).toBe(query);
  });

  it('leaves a query without the clause as it is', () => {
    expect(removeWhere(query, clause)).toBe(query);
  });

  it('does not treat the clause as a regular expression', () => {
    const withDots = appendWhere(query, clause);
    expect(removeWhere(withDots, clause.replace('duration', 'durationX'))).toBe(withDots);
  });
});
