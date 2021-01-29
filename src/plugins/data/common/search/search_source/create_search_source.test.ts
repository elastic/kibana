/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createSearchSource as createSearchSourceFactory } from './create_search_source';
import { SearchSourceDependencies } from './search_source';
import { IIndexPattern } from '../../index_patterns';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { Filter } from '../../es_query/filters';
import { BehaviorSubject } from 'rxjs';

describe('createSearchSource', () => {
  const indexPatternMock: IIndexPattern = {} as IIndexPattern;
  let indexPatternContractMock: jest.Mocked<IndexPatternsContract>;
  let dependencies: SearchSourceDependencies;
  let createSearchSource: ReturnType<typeof createSearchSourceFactory>;

  beforeEach(() => {
    dependencies = {
      getConfig: jest.fn(),
      search: jest.fn(),
      onResponse: (req, res) => res,
      legacy: {
        callMsearch: jest.fn(),
        loadingCount$: new BehaviorSubject(0),
      },
    };

    indexPatternContractMock = ({
      get: jest.fn().mockReturnValue(Promise.resolve(indexPatternMock)),
    } as unknown) as jest.Mocked<IndexPatternsContract>;

    createSearchSource = createSearchSourceFactory(indexPatternContractMock, dependencies);
  });

  it('should set fields', async () => {
    const searchSource = await createSearchSource({
      highlightAll: true,
      query: {
        query: '',
        language: 'kuery',
      },
    });
    expect(searchSource.getOwnField('highlightAll')).toBe(true);
    expect(searchSource.getOwnField('query')).toEqual({
      query: '',
      language: 'kuery',
    });
  });

  it('should set filters and resolve referenced index patterns', async () => {
    const searchSource = await createSearchSource({
      filter: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'category.keyword',
            params: {
              query: "Men's Clothing",
            },
            index: '123-456',
          },
          query: {
            match_phrase: {
              'category.keyword': "Men's Clothing",
            },
          },
        },
      ],
    });
    const filters = searchSource.getOwnField('filter') as Filter[];
    expect(filters[0]).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "alias": null,
          "disabled": false,
          "index": "123-456",
          "key": "category.keyword",
          "negate": false,
          "params": Object {
            "query": "Men's Clothing",
          },
          "type": "phrase",
        },
        "query": Object {
          "match_phrase": Object {
            "category.keyword": "Men's Clothing",
          },
        },
      }
    `);
  });

  it('should migrate legacy queries on the fly', async () => {
    const searchSource = await createSearchSource({
      highlightAll: true,
      query: 'a:b' as any,
    });
    expect(searchSource.getOwnField('query')).toEqual({
      query: 'a:b',
      language: 'lucene',
    });
  });
});
