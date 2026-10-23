/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseEsqlCached } from './parse_esql_cached';

describe('parseEsqlCached', () => {
  it('returns the same result for an identical query string', () => {
    const first = parseEsqlCached('FROM logs | LIMIT 10');
    const second = parseEsqlCached('FROM logs | LIMIT 10');

    expect(second).toBe(first);
  });

  it('returns different results for different query strings', () => {
    const first = parseEsqlCached('FROM logs | LIMIT 10');
    const second = parseEsqlCached('FROM logs | LIMIT 20');

    expect(second).not.toBe(first);
  });

  it('keeps parse errors for invalid queries', () => {
    const { errors } = parseEsqlCached('FROM');

    expect(errors.length).toBeGreaterThan(0);
  });

  it('does not cache a query larger than the size budget', () => {
    const hugeQuery = `FROM logs | WHERE ${'a'.repeat(60_000)} > 1`;

    const first = parseEsqlCached(hugeQuery);
    const second = parseEsqlCached(hugeQuery);

    expect(second).not.toBe(first);
  });

  it('evicts the oldest entries when the size budget is exceeded', () => {
    const mediumQuery = (id: number) => `FROM logs | WHERE ${'a'.repeat(20_000)} > ${id}`;

    const first = parseEsqlCached(mediumQuery(1));
    parseEsqlCached(mediumQuery(2));
    parseEsqlCached(mediumQuery(3));

    expect(parseEsqlCached(mediumQuery(1))).not.toBe(first);
  });

  it('parses and caches an empty query', () => {
    const first = parseEsqlCached('');
    const second = parseEsqlCached('');

    expect(first.root.commands).toHaveLength(0);
    expect(second).toBe(first);
  });
});
