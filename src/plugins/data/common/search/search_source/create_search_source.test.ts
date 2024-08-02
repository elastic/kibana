/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSearchSource as createSearchSourceFactory } from './create_search_source';
import { SearchSourceDependencies } from './search_source';
import type { DataView, DataViewsContract, DataViewLazy } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';

describe('createSearchSource', () => {
  const indexPatternMock: DataView = {} as DataView;
  let indexPatternContractMock: jest.Mocked<DataViewsContract>;
  let dependencies: SearchSourceDependencies;
  let createSearchSource: ReturnType<typeof createSearchSourceFactory>;

  beforeEach(() => {
    dependencies = {
      aggs: {} as SearchSourceDependencies['aggs'],
      getConfig: jest.fn(),
      search: jest.fn(),
      onResponse: (req, res) => res,
      scriptedFieldsEnabled: true,
      dataViews: {
        getMetaFields: jest.fn(),
        getShortDotsEnable: jest.fn(),
      } as unknown as DataViewsContract,
    };

    indexPatternContractMock = {
      get: jest.fn().mockReturnValue(Promise.resolve(indexPatternMock)),
    } as unknown as jest.Mocked<DataViewsContract>;

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

  it('uses DataViews.get', async () => {
    const dataViewMock: DataView = {
      toSpec: jest.fn().mockReturnValue(Promise.resolve({})),
      getSourceFiltering: jest.fn().mockReturnValue({
        excludes: [],
      }),
    } as unknown as DataView;
    const get = jest.fn().mockReturnValue(Promise.resolve(dataViewMock));
    const getDataViewLazy = jest.fn();
    indexPatternContractMock = {
      get,
      getDataViewLazy,
    } as unknown as jest.Mocked<DataViewsContract>;

    createSearchSource = createSearchSourceFactory(indexPatternContractMock, dependencies);

    await createSearchSource({
      index: '123-456',
      highlightAll: true,
      query: {
        query: '',
        language: 'kuery',
      },
    });
    expect(get).toHaveBeenCalledWith('123-456');
    expect(getDataViewLazy).not.toHaveBeenCalled();
  });

  it('uses DataViews.getDataViewLazy when flag is passed', async () => {
    const dataViewLazyMock: DataViewLazy = {
      toSpec: jest.fn().mockReturnValue(Promise.resolve({})),
      getSourceFiltering: jest.fn().mockReturnValue({
        excludes: [],
      }),
    } as unknown as DataViewLazy;
    const get = jest.fn();
    const getDataViewLazy = jest.fn().mockReturnValue(Promise.resolve(dataViewLazyMock));
    indexPatternContractMock = {
      get,
      getDataViewLazy,
    } as unknown as jest.Mocked<DataViewsContract>;

    createSearchSource = createSearchSourceFactory(indexPatternContractMock, dependencies);

    await createSearchSource(
      {
        index: '123-456',
        highlightAll: true,
        query: {
          query: '',
          language: 'kuery',
        },
      },
      true
    );
    expect(get).not.toHaveBeenCalled();
    expect(getDataViewLazy).toHaveBeenCalledWith('123-456');
  });
});
