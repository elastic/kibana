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
import { IndexPattern } from '../../index_patterns/index_patterns';
import { SearchSource } from './search_source';
import { serializeSearchSource } from './serialize_search_source';
import { SortDirection } from './types';

describe('serializeSearchSource', function() {
  // const indexPatternMock: IIndexPattern = {} as IIndexPattern;
  // let indexPatternContractMock: jest.Mocked<IndexPatternsContract>;

  beforeEach(() => {
    // indexPatternContractMock = ({
    //   get: jest.fn().mockReturnValue(Promise.resolve(indexPatternMock)),
    // } as unknown) as jest.Mocked<IndexPatternsContract>;
  });

  it('should reference index patterns', () => {
    const indexPattern = { id: '123' } as IndexPattern;
    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    const { searchSourceJSON, references } = serializeSearchSource(searchSource);
    expect(references[0].id).toEqual('123');
    expect(references[0].type).toEqual('index-pattern');
    expect(JSON.parse(searchSourceJSON).indexRefName).toEqual(references[0].name);
  });

  it('should add other fields', () => {
    const searchSource = new SearchSource();
    searchSource.setField('highlightAll', true);
    searchSource.setField('from', 123456);
    const { searchSourceJSON } = serializeSearchSource(searchSource);
    expect(JSON.parse(searchSourceJSON).highlightAll).toEqual(true);
    expect(JSON.parse(searchSourceJSON).from).toEqual(123456);
  });

  it('should omit sort and size', () => {
    const searchSource = new SearchSource();
    searchSource.setField('highlightAll', true);
    searchSource.setField('from', 123456);
    searchSource.setField('sort', { field: SortDirection.asc });
    searchSource.setField('size', 200);
    const { searchSourceJSON } = serializeSearchSource(searchSource);
    expect(Object.keys(JSON.parse(searchSourceJSON))).toEqual(['highlightAll', 'from']);
  });

  it('should serialize filters', () => {
    const searchSource = new SearchSource();
    const filter = [
      {
        query: 'query',
        meta: {
          alias: 'alias',
          disabled: false,
          negate: false,
        },
      },
    ];
    searchSource.setField('filter', filter);
    const { searchSourceJSON } = serializeSearchSource(searchSource);
    expect(JSON.parse(searchSourceJSON).filter).toEqual(filter);
  });

  it('should reference index patterns in filters separately from index field', () => {
    const searchSource = new SearchSource();
    const indexPattern = { id: '123' } as IndexPattern;
    searchSource.setField('index', indexPattern);
    const filter = [
      {
        query: 'query',
        meta: {
          alias: 'alias',
          disabled: false,
          negate: false,
          index: '456',
        },
      },
    ];
    searchSource.setField('filter', filter);
    const { searchSourceJSON, references } = serializeSearchSource(searchSource);
    expect(references[0].id).toEqual('123');
    expect(references[0].type).toEqual('index-pattern');
    expect(JSON.parse(searchSourceJSON).indexRefName).toEqual(references[0].name);
    expect(references[1].id).toEqual('456');
    expect(references[1].type).toEqual('index-pattern');
    expect(JSON.parse(searchSourceJSON).filter[0].meta.indexRefName).toEqual(references[1].name);
  });
});
