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
import { Observable } from 'rxjs';
import { SearchSource } from './search_source';
import { IndexPattern, SortDirection } from '../..';
import { fetchSoon } from '../legacy';
import { IUiSettingsClient } from '../../../../../core/public';
import { dataPluginMock } from '../../../../data/public/mocks';
import { coreMock } from '../../../../../core/public/mocks';

jest.mock('../legacy', () => ({
  fetchSoon: jest.fn().mockResolvedValue({}),
}));

const getComputedFields = () => ({
  storedFields: [],
  scriptFields: [],
  docvalueFields: [],
});

const mockSource = { excludes: ['foo-*'] };
const mockSource2 = { excludes: ['bar-*'] };

const indexPattern = ({
  title: 'foo',
  getComputedFields,
  getSourceFiltering: () => mockSource,
} as unknown) as IndexPattern;

const indexPattern2 = ({
  title: 'foo',
  getComputedFields,
  getSourceFiltering: () => mockSource2,
} as unknown) as IndexPattern;

describe('SearchSource', () => {
  let mockSearchMethod: any;
  let searchSourceDependencies: any;

  beforeEach(() => {
    const core = coreMock.createStart();
    const data = dataPluginMock.createStartContract();

    mockSearchMethod = jest.fn(() => {
      return new Observable((subscriber) => {
        setTimeout(() => {
          subscriber.next({
            rawResponse: '',
          });
          subscriber.complete();
        }, 100);
      });
    });

    searchSourceDependencies = {
      search: mockSearchMethod,
      legacySearch: data.search.__LEGACY,
      injectedMetadata: core.injectedMetadata,
      uiSettings: core.uiSettings,
    };
  });

  describe('#setField()', () => {
    test('sets the value for the property', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });
  });

  describe('#getField()', () => {
    test('gets the value for the property', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });
  });

  describe(`#setField('index')`, () => {
    describe('auto-sourceFiltering', () => {
      describe('new index pattern assigned', () => {
        test('generates a searchSource filter', async () => {
          const searchSource = new SearchSource({}, searchSourceDependencies);
          expect(searchSource.getField('index')).toBe(undefined);
          expect(searchSource.getField('source')).toBe(undefined);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).toBe(indexPattern);
          const request = await searchSource.getSearchRequestBody();
          expect(request._source).toBe(mockSource);
        });

        test('removes created searchSource filter on removal', async () => {
          const searchSource = new SearchSource({}, searchSourceDependencies);
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', undefined);
          const request = await searchSource.getSearchRequestBody();
          expect(request._source).toBe(undefined);
        });
      });

      describe('new index pattern assigned over another', () => {
        test('replaces searchSource filter with new', async () => {
          const searchSource = new SearchSource({}, searchSourceDependencies);
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', indexPattern2);
          expect(searchSource.getField('index')).toBe(indexPattern2);
          const request = await searchSource.getSearchRequestBody();
          expect(request._source).toBe(mockSource2);
        });

        test('removes created searchSource filter on removal', async () => {
          const searchSource = new SearchSource({}, searchSourceDependencies);
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', indexPattern2);
          searchSource.setField('index', undefined);
          const request = await searchSource.getSearchRequestBody();
          expect(request._source).toBe(undefined);
        });
      });
    });
  });

  describe('#onRequestStart()', () => {
    test('should be called when starting a request', async () => {
      const searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const options = {};
      await searchSource.fetch(options);
      expect(fn).toBeCalledWith(searchSource, options);
    });

    test('should not be called on parent searchSource', async () => {
      const parent = new SearchSource({}, searchSourceDependencies);
      const searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const options = {};
      await searchSource.fetch(options);

      expect(fn).toBeCalledWith(searchSource, options);
      expect(parentFn).not.toBeCalled();
    });

    test('should be called on parent searchSource if callParentStartHandlers is true', async () => {
      const parent = new SearchSource({}, searchSourceDependencies);
      const searchSource = new SearchSource(
        { index: indexPattern },
        searchSourceDependencies
      ).setParent(parent, {
        callParentStartHandlers: true,
      });

      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const parentFn = jest.fn();
      parent.onRequestStart(parentFn);
      const options = {};
      await searchSource.fetch(options);

      expect(fn).toBeCalledWith(searchSource, options);
      expect(parentFn).toBeCalledWith(searchSource, options);
    });
  });

  describe('#legacy fetch()', () => {
    beforeEach(() => {
      const core = coreMock.createStart();

      searchSourceDependencies = {
        ...searchSourceDependencies,
        uiSettings: {
          ...core.uiSettings,
          get: jest.fn(() => {
            return true; // batchSearches = true
          }),
        } as IUiSettingsClient,
      };
    });

    test('should call msearch', async () => {
      const searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const options = {};
      await searchSource.fetch(options);
      expect(fetchSoon).toBeCalledTimes(1);
    });
  });

  describe('#search service fetch()', () => {
    test('should call msearch', async () => {
      const searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const options = {};

      await searchSource.fetch(options);
      expect(mockSearchMethod).toBeCalledTimes(1);
    });
  });

  describe('#serialize', () => {
    test('should reference index patterns', () => {
      const indexPattern123 = { id: '123' } as IndexPattern;
      const searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('index', indexPattern123);
      const { searchSourceJSON, references } = searchSource.serialize();
      expect(references[0].id).toEqual('123');
      expect(references[0].type).toEqual('index-pattern');
      expect(JSON.parse(searchSourceJSON).indexRefName).toEqual(references[0].name);
    });

    test('should add other fields', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('highlightAll', true);
      searchSource.setField('from', 123456);
      const { searchSourceJSON } = searchSource.serialize();
      expect(JSON.parse(searchSourceJSON).highlightAll).toEqual(true);
      expect(JSON.parse(searchSourceJSON).from).toEqual(123456);
    });

    test('should omit sort and size', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('highlightAll', true);
      searchSource.setField('from', 123456);
      searchSource.setField('sort', { field: SortDirection.asc });
      searchSource.setField('size', 200);
      const { searchSourceJSON } = searchSource.serialize();
      expect(Object.keys(JSON.parse(searchSourceJSON))).toEqual(['highlightAll', 'from']);
    });

    test('should serialize filters', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
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
      const { searchSourceJSON } = searchSource.serialize();
      expect(JSON.parse(searchSourceJSON).filter).toEqual(filter);
    });

    test('should reference index patterns in filters separately from index field', () => {
      const searchSource = new SearchSource({}, searchSourceDependencies);
      const indexPattern123 = { id: '123' } as IndexPattern;
      searchSource.setField('index', indexPattern123);
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
      const { searchSourceJSON, references } = searchSource.serialize();
      expect(references[0].id).toEqual('123');
      expect(references[0].type).toEqual('index-pattern');
      expect(JSON.parse(searchSourceJSON).indexRefName).toEqual(references[0].name);
      expect(references[1].id).toEqual('456');
      expect(references[1].type).toEqual('index-pattern');
      expect(JSON.parse(searchSourceJSON).filter[0].meta.indexRefName).toEqual(references[1].name);
    });
  });
});
