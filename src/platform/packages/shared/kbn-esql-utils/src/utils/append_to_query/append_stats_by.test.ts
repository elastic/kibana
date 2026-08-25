/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendStatsByToQuery } from './append_stats_by';

describe('appendStatsByToQuery', () => {
  it('should append the stats by clause to the query', () => {
    const queryString = 'FROM my_index';
    const statsBy = 'my_field';
    const updatedQueryString = appendStatsByToQuery(queryString, statsBy);
    expect(updatedQueryString).toBe('FROM my_index\n| STATS BY my_field');
  });

  it('should append the stats by clause to the query with existing clauses', () => {
    const queryString = 'FROM my_index | LIMIT 10 | STATS BY meow';
    const statsBy = 'my_field';
    const updatedQueryString = appendStatsByToQuery(queryString, statsBy);
    expect(updatedQueryString).toBe('FROM my_index | LIMIT 10\n| STATS BY my_field');
  });
});
