/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterStateStore } from '@kbn/es-query';
import fc from 'fast-check';
import { of } from 'rxjs';
import type { SearchSourceDependencies } from './search_source';
import { SearchSource } from './search_source';
import {
  EsQuerySortValue,
  SearchSourceFields,
  SortDirection,
  SortDirectionFormat,
  SortDirectionNumeric,
} from './types';

fc.configureGlobal({
  numRuns: 1000,
});

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitraryQuery() {
  return fc.record({ query: fc.oneof(fc.string(), fc.object()), language: fc.string() });
}

function arbitraryFilter(): fc.Arbitrary<Filter> {
  return fc.record({
    $state: option(
      fc.record({
        store: fc.oneof(
          fc.constant(FilterStateStore.APP_STATE),
          fc.constant(FilterStateStore.GLOBAL_STATE)
        ),
      })
    ),
    meta: fc.record({
      alias: fc.option(fc.string()),
      disabled: option(fc.boolean()),
      negate: option(fc.boolean()),
      controlledBy: option(fc.string()),
      group: option(fc.string()),
      index: option(fc.string()),
      isMultiIndex: option(fc.boolean()),
      type: option(fc.string()),
      key: option(fc.string()),
      params: fc.anything(),
      value: option(fc.string()),
    }),
    query: option(fc.object()),
  });
}

const sortDirectionsData: Array<fc.Arbitrary<SortDirection>> = [
  fc.constant(SortDirection.asc),
  fc.constant(SortDirection.desc),
];

const sortNumericTypeData: Array<fc.Arbitrary<SortDirectionNumeric['numeric_type']>> = [
  fc.constant('double'),
  fc.constant('long'),
  fc.constant('date'),
  fc.constant('date_nanos'),
];

function arbitrarySortDirectionsNumeric(): fc.Arbitrary<SortDirectionNumeric> {
  return fc.record({
    order: fc.oneof(...sortDirectionsData),
    numeric_type: option(fc.oneof(...sortNumericTypeData)),
  });
}

function arbitraryQuerySortValue(): fc.Arbitrary<EsQuerySortValue> {
  return fc.object({
    values: [
      fc.oneof(...sortDirectionsData, arbitraryDirectionFormat(), arbitrarySortDirectionsNumeric()),
    ],
  }) as fc.Arbitrary<EsQuerySortValue>;
}

function arbitraryDirectionFormat(): fc.Arbitrary<SortDirectionFormat> {
  return fc.record({
    order: fc.oneof(...sortDirectionsData),
    format: option(fc.string()),
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

  it('should serialize, deserialize and then serialize to the same source fields with some exceptions', () => {
    fc.assert(
      fc.property(
        option(fc.string()), // type
        option(arbitraryQuery()), // query
        option(
          fc.oneof(
            fc.array(arbitraryFilter()),
            arbitraryFilter(),
            fc.func(fc.oneof(arbitraryFilter(), fc.array(arbitraryFilter())))
          )
        ), // filter: ;
        option(fc.oneof(arbitraryQuerySortValue(), fc.array(arbitraryQuerySortValue()))), // sort
        option(fc.anything()), // highlight
        option(fc.boolean()), // highlightAll
        option(fc.oneof(fc.boolean(), fc.nat())), // trackTotalHits
        option(fc.oneof(fc.object(), fc.func(fc.object()))), // aggs
        option(fc.nat()), // from
        option(fc.nat()), // size
        option(fc.oneof(fc.boolean(), fc.string(), fc.array(fc.string()))), // source
        option(fc.boolean()), // version
        (
          type,
          query,
          filter,
          sort,
          highlight,
          highlightAll,
          trackTotalHits,
          aggs,
          from,
          size,
          source,
          version
        ) => {
          const searchSourceFields: SearchSourceFields = {
            type,
            query,
            filter,
            sort,
            highlight,
            highlightAll,
            trackTotalHits,
            aggs,
            from,
            size,
            source,
            version,
          };

          const {
            size: omit, // we exclude size from the serialization (why?)
            ...searchSourceFieldsSubset
          } = searchSourceFields;

          const filterFinal = typeof filter === 'function' ? filter() : filter;

          const searchSource = new SearchSource(searchSourceFields, searchSourceDependencies);
          expect({
            ...searchSourceFieldsSubset,
            // Always return an array of the filter if there were 1 or more
            filter: filterFinal
              ? Array.isArray(filterFinal)
                ? filterFinal
                : [filterFinal]
              : undefined,
          }).toEqual(searchSource.getSerializedFields(true));
        }
      )
    );
  });
});
