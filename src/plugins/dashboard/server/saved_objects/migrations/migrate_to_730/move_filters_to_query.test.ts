/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore, Filter } from '@kbn/es-query';
import { moveFiltersToQuery, Pre600FilterQuery } from './move_filters_to_query';

const filter: Filter = {
  meta: { disabled: false, negate: false, alias: '' },
  query: {},
  $state: { store: FilterStateStore.APP_STATE },
};

const queryFilter: Pre600FilterQuery = {
  query: { query_string: { query: 'hi!', analyze_wildcard: true } },
};

test('Migrates an old filter query into the query field', () => {
  const newSearchSource = moveFiltersToQuery({
    filter: [filter, queryFilter],
  });

  expect(newSearchSource).toEqual({
    filter: [
      {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          alias: '',
          disabled: false,
          negate: false,
        },
        query: {},
      },
    ],
    query: {
      language: 'lucene',
      query: 'hi!',
    },
  });
});

test('Preserves query if search source is new', () => {
  const newSearchSource = moveFiltersToQuery({
    filter: [filter],
    query: { query: 'bye', language: 'kuery' },
  });

  expect(newSearchSource.query).toEqual({ query: 'bye', language: 'kuery' });
});
