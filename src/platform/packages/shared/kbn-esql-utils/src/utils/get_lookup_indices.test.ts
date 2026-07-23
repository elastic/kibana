/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLookupIndexReferencesFromQuery } from './get_lookup_indices';

describe('getLookupIndexReferencesFromQuery', () => {
  it('returns an empty array for an empty query', () => {
    expect(getLookupIndexReferencesFromQuery('')).toEqual([]);
  });

  it('returns an empty array for a query with no join commands', () => {
    const query = 'FROM my_index | WHERE status = 200';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([]);
  });

  it('returns an empty array for a join command with no index', () => {
    const query = `FROM kibana_sample_data_ecommerce
  | EVAL customer_id = TO_LONG(customer_id)
  | LOOKUP JOIN `;

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([]);
  });

  it('extracts a single lookup index from a simple join query', () => {
    const query = 'FROM my_index | LOOKUP JOIN lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: 'lookup_index',
        indexName: 'lookup_index',
        isCoordinator: false,
        isRemote: false,
      },
    ]);
  });

  it('extracts multiple lookup indices from a query with multiple joins', () => {
    const query = `FROM my_index
    | LOOKUP JOIN lookup1 ON id
    | LOOKUP JOIN lookup2 ON user`;

    expect(getLookupIndexReferencesFromQuery(query).map(({ indexName }) => indexName)).toEqual([
      'lookup1',
      'lookup2',
    ]);
  });

  it('returns a single reference if the same index is used multiple times', () => {
    const query = 'FROM my_index | LOOKUP JOIN lookup1 ON id | LOOKUP JOIN lookup1 ON user';

    expect(getLookupIndexReferencesFromQuery(query)).toHaveLength(1);
  });

  it('handles different casing for the JOIN keyword', () => {
    const query = 'FROM my_index | lookup join lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query).map(({ indexName }) => indexName)).toEqual([
      'lookup_index',
    ]);
  });

  it('separates the query source from the coordinator index name', () => {
    const query = 'FROM remote:index | LOOKUP JOIN _coordinator:lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: '_coordinator:lookup_index',
        indexName: 'lookup_index',
        isCoordinator: true,
        isRemote: false,
      },
    ]);
  });

  it('extracts a coordinator index with a JOIN alias', () => {
    const query = 'FROM remote:index | LOOKUP JOIN _coordinator:lookup_index AS lookup ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: '_coordinator:lookup_index',
        indexName: 'lookup_index',
        isCoordinator: true,
        isRemote: false,
      },
    ]);
  });

  it('uses the same source and index name for an unprefixed target', () => {
    const query = 'FROM index | LOOKUP JOIN lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: 'lookup_index',
        indexName: 'lookup_index',
        isCoordinator: false,
        isRemote: false,
      },
    ]);
  });

  it('marks unprefixed lookup indices as remote when the query source is remote', () => {
    const query = 'FROM remote:index | LOOKUP JOIN lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: 'lookup_index',
        indexName: 'lookup_index',
        isCoordinator: false,
        isRemote: true,
      },
    ]);
  });

  it('keeps distinct references for prefixed and unprefixed targets of the same index', () => {
    const query =
      'FROM remote:index | LOOKUP JOIN lookup1 ON id | LOOKUP JOIN _coordinator:lookup1 ON user';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      { sourceName: 'lookup1', indexName: 'lookup1', isCoordinator: false, isRemote: true },
      {
        sourceName: '_coordinator:lookup1',
        indexName: 'lookup1',
        isCoordinator: true,
        isRemote: false,
      },
    ]);
  });

  it('does not treat other prefixes as coordinator targets', () => {
    const query = 'FROM my_index | LOOKUP JOIN remote1:lookup_index ON id';

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      {
        sourceName: 'remote1:lookup_index',
        indexName: 'remote1:lookup_index',
        isCoordinator: false,
        isRemote: false,
      },
    ]);
  });

  it('extracts lookup indices from joins inside FORK branches', () => {
    const query = `FROM my_index
    | FORK (LOOKUP JOIN lookup1 ON id) (WHERE status == 200)`;

    expect(getLookupIndexReferencesFromQuery(query)).toEqual([
      { sourceName: 'lookup1', indexName: 'lookup1', isCoordinator: false, isRemote: false },
    ]);
  });
});
