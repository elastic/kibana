/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLookupIndicesFromQuery } from './get_lookup_indices';

describe('getLookupIndicesFromQuery', () => {
  it('should return an empty array for an empty query', () => {
    const query = '';
    expect(getLookupIndicesFromQuery(query)).toEqual([]);
  });

  it('should return an empty array for a query with no join commands', () => {
    const query = 'FROM my_index | WHERE status = 200';
    expect(getLookupIndicesFromQuery(query)).toEqual([]);
  });

  it('should return an empty array for a query with join commands but no indices', () => {
    const query = `FROM kibana_sample_data_ecommerce
  | EVAL customer_id = TO_LONG(customer_id)
  | LOOKUP JOIN `;
    expect(getLookupIndicesFromQuery(query)).toEqual([]);
  });

  it('should extract a single lookup index from a simple join query', () => {
    const query = 'FROM my_index | LOOKUP JOIN lookup_index ON id';
    expect(getLookupIndicesFromQuery(query)).toEqual(['lookup_index']);
  });

  it('should extract multiple lookup indices from a query with multiple joins', () => {
    const query = `FROM my_index
    | LOOKUP JOIN lookup1 ON id
    | LOOKUP JOIN lookup2 ON user`;
    expect(getLookupIndicesFromQuery(query)).toEqual(['lookup1', 'lookup2']);
  });

  it('should return unique lookup indices if the same index is used multiple times', () => {
    const query = 'FROM my_index | LOOKUP JOIN lookup1 ON id | LOOKUP JOIN lookup1 ON user';
    expect(getLookupIndicesFromQuery(query)).toEqual(['lookup1']);
  });

  it('should handle different casing for JOIN keyword', () => {
    const query = 'FROM my_index | lookup join lookup_index ON id';
    expect(getLookupIndicesFromQuery(query)).toEqual(['lookup_index']);
  });
});
