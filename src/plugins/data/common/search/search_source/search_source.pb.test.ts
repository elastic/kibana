/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore } from '@kbn/es-query';
import fc from 'fast-check';
import { of } from 'rxjs';
import type { SearchSourceDependencies } from './search_source';
import { SearchSource } from './search_source';
import { SearchSourceFields } from './types';

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitraryQuery() {
  return fc.record({ query: fc.oneof(fc.string(), fc.object()), language: fc.string() });
}

function arbitraryFilter() {
  return fc.record({
    $state: option(
      fc.record({
        store: fc.oneof(
          fc.constant(FilterStateStore.APP_STATE),
          fc.constant(FilterStateStore.GLOBAL_STATE)
        ),
      })
    ),
  });
}

describe('Search source properties', () => {
  const getConfigMock = jest
    .fn()
    .mockImplementation((param) => param === 'metaFields' && ['_type', '_source', '_id'])
    .mockName('getConfig');

  const mockSearchMethod = jest
    .fn()
    .mockReturnValue(
      of(
        { rawResponse: { test: 1 }, isPartial: true, isRunning: true },
        { rawResponse: { test: 2 }, isPartial: false, isRunning: false }
      )
    );

  const searchSourceDependencies: SearchSourceDependencies = {
    getConfig: getConfigMock,
    search: mockSearchMethod,
    onResponse: (req, res) => res,
  };

  it('should serialize, deserialize and then serialize to the same source fields', () => {
    fc.assert(
      fc.property(
        option(fc.string()), // type
        option(arbitraryQuery()), // query
        option(fc.array(fc.object())), // filter
        option(fc.boolean()), // highlightAll
        option(fc.oneof(fc.boolean(), fc.nat())), // trackTotalHits
        option(fc.nat()), // from
        option(fc.nat()), // size
        (type, query, filter, highlightAll, trackTotalHits, from, size) => {
          const searchSourceFields: SearchSourceFields = {
            type,
            query,
            filter,
            highlightAll,
            trackTotalHits,
            from,
            size,
          };
          const { size: omit, ...searchSourceFieldsMinusSize } = searchSourceFields;

          const searchSource = new SearchSource(searchSourceFields, searchSourceDependencies);
          expect(searchSourceFieldsMinusSize).toEqual(searchSource.getSerializedFields(true));
        }
      )
    );
  });
});
