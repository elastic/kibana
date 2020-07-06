/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { createSearchSource as createSearchSourceFactory } from './create_search_source';
import { IIndexPattern } from '../../../common/index_patterns';
import { IndexPatternsContract } from '../../index_patterns/index_patterns';
import { Filter } from '../../../common/es_query/filters';
import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../mocks';

describe('createSearchSource', () => {
  const indexPatternMock: IIndexPattern = {} as IIndexPattern;
  let indexPatternContractMock: jest.Mocked<IndexPatternsContract>;
  let dependencies: any;
  let createSearchSource: ReturnType<typeof createSearchSourceFactory>;

  beforeEach(() => {
    const core = coreMock.createStart();
    const data = dataPluginMock.createStartContract();

    dependencies = {
      searchService: data.search,
      uiSettings: core.uiSettings,
      injectedMetadata: core.injectedMetadata,
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
