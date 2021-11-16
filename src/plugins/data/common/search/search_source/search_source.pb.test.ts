/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterStateStore } from '@kbn/es-query';
import { Fields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import fc from 'fast-check';
import { of } from 'rxjs';

import { IndexPattern } from 'src/plugins/data/public';
import { createStubDataView } from '../../../../data_views/common/mocks';
import { IAggConfigs } from '../aggs';
import { Query } from '../..';
import { IndexPatternsContract } from '../..';
import type { SearchSourceDependencies } from './search_source';
import { SearchSource } from './search_source';
import {
  EsQuerySearchAfter,
  EsQuerySortValue,
  SearchFieldValue,
  SearchSourceFields,
  SortDirection,
  SortDirectionFormat,
  SortDirectionNumeric,
} from './types';
import { createSearchSource } from './create_search_source';

fc.configureGlobal({
  numRuns: 1000,
});

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitraryQuery(): fc.Arbitrary<Query> {
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

function arbitraryDataView(): fc.Arbitrary<IndexPattern> {
  return fc.record({
    id: fc.string({ minLength: 1 }),
    title: fc.string(),
    fieldFormatMap: fc.object(),
    allowNoIndex: fc.boolean(),
  }) as unknown as fc.Arbitrary<IndexPattern>;
}

function arbitraryAggConfigs(): fc.Arbitrary<IAggConfigs> {
  return fc.record({
    id: fc.string(),
    enabled: fc.boolean(),
    params: fc.anything(),
    brandNew: option(fc.boolean()),
    indexPattern: arbitraryDataView(),
  }) as unknown as fc.Arbitrary<IAggConfigs>;
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

function arbitraryFields(): fc.Arbitrary<Fields> {
  return fc.oneof(fc.string(), fc.array(fc.string()));
}

const arbitrarySearchField = fc.memo((n) => {
  return fc.object({ values: [arbitrarySearchFieldValue(n)] });
});

const arbitrarySearchFieldValue: fc.Memo<SearchFieldValue> = fc.memo((n) =>
  n > 1
    ? (fc.object({ values: [arbitrarySearchField()] }) as fc.Arbitrary<SearchFieldValue>)
    : fc.string()
);

function artbitraryEsQuerySearchAfter(): fc.Arbitrary<EsQuerySearchAfter> {
  return fc.array(fc.oneof(fc.string(), fc.nat()), {
    maxLength: 2,
  }) as fc.Arbitrary<EsQuerySearchAfter>;
}

const arbitrarySearchSourceFields: fc.Memo<SearchSourceFields> = fc.memo((n) => {
  return fc.record<SearchSourceFields>({
    type: option(fc.string()),
    query: option(arbitraryQuery()),
    filter: option(
      fc.oneof(
        fc.array(arbitraryFilter()),
        arbitraryFilter(),
        fc.func(fc.oneof(arbitraryFilter(), fc.array(arbitraryFilter())))
      )
    ),
    sort: option(fc.oneof(arbitraryQuerySortValue(), fc.array(arbitraryQuerySortValue()))),
    highlight: option(fc.anything()),
    highlightAll: option(fc.boolean()),
    trackTotalHits: option(fc.oneof(fc.boolean(), fc.nat())),
    aggs: option(fc.oneof(fc.object(), fc.func(fc.object()), arbitraryAggConfigs())),
    from: option(fc.nat()),
    size: option(fc.nat()),
    source: option(fc.oneof(fc.boolean(), arbitraryFields())),
    version: option(fc.boolean()),
    fields: option(fc.array(arbitrarySearchFieldValue(2))),
    fieldsFromSource: option(arbitraryFields()),
    index: option(arbitraryDataView()),
    searchAfter: option(artbitraryEsQuerySearchAfter()),
    timeout: option(fc.string()),
    terminate_after: option(fc.nat()),
    parent: n > 1 ? arbitrarySearchSourceFields(n) : fc.constant(undefined),
  });
});

describe('Search source properties', () => {
  /**
   * NOTES
   *
   * * It is kind of weird that {@link SearchSourceFields} accepts non-serializable values
   *   considering that the intention of the source fields is to be passed over the wire...
   */
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

  const stripSize = (fields: SearchSourceFields): SearchSourceFields => {
    let current: SearchSourceFields = { ...fields };
    while (true) {
      delete current.size;
      if (!current.parent) break;
      else {
        current.parent = { ...current.parent };
        current = current.parent;
      }
    }
    return current;
  };

  const prepResult = (searchSourceFields: SearchSourceFields) => {
    const { filter } = searchSourceFields;

    // We exclude size from serialized result (why?)
    const searchSourceFieldsWithNoSize = stripSize(searchSourceFields);

    const filterFinal = typeof filter === 'function' ? filter() : filter;

    return {
      ...searchSourceFieldsWithNoSize,
      // Always return an array of the filter if there were 1 or more
      filter: filterFinal ? (Array.isArray(filterFinal) ? filterFinal : [filterFinal]) : undefined,
    };
  };

  it('should recursively serialize, deserialize to the same source fields with some exceptions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchSourceFields(1 /* max number of parent search sources */),
        async (searchSourceFields) => {
          const searchSource = new SearchSource(searchSourceFields, searchSourceDependencies);
          const indexPatterns = {
            get: jest.fn().mockResolvedValue(searchSourceFields.index),
          } as unknown as IndexPatternsContract;

          const create = createSearchSource(indexPatterns, searchSourceDependencies);
          const serializedFields = searchSource.getSerializedFields(true);

          expect((await create(serializedFields)).getFields()).toEqual(
            prepResult(searchSourceFields)
          );
        }
      )
    );
  });
});
