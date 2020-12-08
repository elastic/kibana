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

import { BehaviorSubject, of } from 'rxjs';
import { IndexPattern } from '../../index_patterns';
import { GetConfigFn } from '../../types';
import { fetchSoon } from './legacy';
import { SearchSource, SearchSourceDependencies, SortDirection } from './';

jest.mock('./legacy', () => ({
  fetchSoon: jest.fn().mockResolvedValue({}),
}));

const getComputedFields = () => ({
  storedFields: [],
  scriptFields: {},
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
  let searchSourceDependencies: SearchSourceDependencies;
  let searchSource: SearchSource;

  beforeEach(() => {
    mockSearchMethod = jest.fn().mockReturnValue(of({ rawResponse: '' }));

    searchSourceDependencies = {
      getConfig: jest.fn(),
      search: mockSearchMethod,
      onResponse: (req, res) => res,
      legacy: {
        callMsearch: jest.fn(),
        loadingCount$: new BehaviorSubject(0),
      },
    };

    searchSource = new SearchSource({}, searchSourceDependencies);
  });

  describe('#getField()', () => {
    test('gets the value for the property', () => {
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });
  });

  describe('#removeField()', () => {
    test('remove property', () => {
      searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('aggs', 5);
      searchSource.removeField('aggs');
      expect(searchSource.getField('aggs')).toBeFalsy();
    });
  });

  describe('#setField() / #flatten', () => {
    test('sets the value for the property', () => {
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).toBe(5);
    });

    describe('computed fields handling', () => {
      test('still provides computed fields when no fields are specified', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['hello'],
            scriptFields: { world: {} },
            docvalueFields: ['@timestamp'],
          }),
        } as unknown) as IndexPattern);

        const request = await searchSource.getSearchRequestBody();
        expect(request.stored_fields).toEqual(['hello']);
        expect(request.script_fields).toEqual({ world: {} });
        expect(request.fields).toEqual(['@timestamp']);
      });

      test('never includes docvalue_fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp'],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['@timestamp']);
        searchSource.setField('fieldsFromSource', ['foo']);

        const request = await searchSource.getSearchRequestBody();
        expect(request).not.toHaveProperty('docvalue_fields');
      });

      test('overrides computed docvalue fields with ones that are provided', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['hello'],
          }),
        } as unknown) as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('docvalue_fields', ['world']);

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('docvalue_fields');
        expect(request.docvalue_fields).toEqual(['world']);
      });

      test('allows explicitly provided docvalue fields to override fields API when fetching fieldsFromSource', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'a', format: 'date_time' }],
          }),
        } as unknown) as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('docvalue_fields', [{ field: 'b', format: 'date_time' }]);
        searchSource.setField('fields', ['c']);
        searchSource.setField('fieldsFromSource', ['a', 'b', 'd']);

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('docvalue_fields');
        expect(request._source.includes).toEqual(['c', 'a', 'b', 'd']);
        expect(request.docvalue_fields).toEqual([{ field: 'b', format: 'date_time' }]);
        expect(request.fields).toEqual(['c', { field: 'a', format: 'date_time' }]);
      });

      test('allows you to override computed fields if you provide a format', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time' }],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', [{ field: 'hello', format: 'strict_date_time' }]);

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([{ field: 'hello', format: 'strict_date_time' }]);
      });

      test('injects a date format for computed docvalue fields if none is provided', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time' }],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello']);

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([{ field: 'hello', format: 'date_time' }]);
      });

      test('injects a date format for computed docvalue fields while merging other properties', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time', a: 'test', b: 'test' }],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', [{ field: 'hello', a: 'a', c: 'c' }]);

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([
          { field: 'hello', format: 'date_time', a: 'a', b: 'test', c: 'c' },
        ]);
      });

      test('merges provided script fields with computed fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown) as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('script_fields', { world: {} });

        const request = await searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('script_fields');
        expect(request.script_fields).toEqual({
          hello: {},
          world: {},
        });
      });

      test(`requests any fields that aren't script_fields from stored_fields`, async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello', 'a', { field: 'c' }]);

        const request = await searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a', 'c']);
      });

      test('ignores objects without a `field` property when setting stored_fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello', 'a', { foo: 'c' }]);

        const request = await searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a']);
      });

      test(`requests any fields that aren't script_fields from stored_fields with fieldsFromSource`, async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fieldsFromSource', ['hello', 'a']);

        const request = await searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a']);
      });

      test('defaults to * for stored fields when no fields are provided', async () => {
        const requestA = await searchSource.getSearchRequestBody();
        expect(requestA.stored_fields).toEqual(['*']);

        searchSource.setField('fields', ['*']);
        const requestB = await searchSource.getSearchRequestBody();
        expect(requestB.stored_fields).toEqual(['*']);
      });

      test('defaults to * for stored fields when no fields are provided with fieldsFromSource', async () => {
        searchSource.setField('fieldsFromSource', ['*']);
        const request = await searchSource.getSearchRequestBody();
        expect(request.stored_fields).toEqual(['*']);
      });
    });

    describe('source filters handling', () => {
      test('excludes docvalue fields based on source filtering', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp', 'exclude-me'],
          }),
        } as unknown) as IndexPattern);
        // @ts-expect-error Typings for excludes filters need to be fixed.
        searchSource.setField('source', { excludes: ['exclude-*'] });

        const request = await searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['@timestamp']);
      });

      test('defaults to source filters from index pattern', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp', 'foo-bar', 'foo-baz'],
          }),
        } as unknown) as IndexPattern);

        const request = await searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['@timestamp']);
      });

      test('filters script fields to only include specified fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: [],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello']);

        const request = await searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
      });
    });

    describe('handling for when specific fields are provided', () => {
      test('fieldsFromSource will request any fields outside of script_fields from _source & stored fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp'],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fieldsFromSource', [
          'hello',
          'world',
          '@timestamp',
          'foo-a',
          'bar-b',
        ]);

        const request = await searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar-b'],
        });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar-b']);
      });

      test('filters request when a specific list of fields is provided', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date'],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello', '@timestamp', 'foo-a', 'bar']);

        const request = await searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['hello', '@timestamp', 'bar']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar']);
      });

      test('filters request when a specific list of fields is provided with fieldsFromSource', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date'],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fieldsFromSource', ['hello', '@timestamp', 'foo-a', 'bar']);

        const request = await searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar'],
        });
        expect(request.fields).toEqual(['@timestamp']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar']);
      });

      test('filters request when a specific list of fields is provided with fieldsFromSource or fields', async () => {
        searchSource.setField('index', ({
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date', 'time'],
          }),
        } as unknown) as IndexPattern);
        searchSource.setField('fields', ['hello', '@timestamp', 'foo-a', 'bar']);
        searchSource.setField('fieldsFromSource', ['foo-b', 'date', 'baz']);

        const request = await searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar', 'date', 'baz'],
        });
        expect(request.fields).toEqual(['hello', '@timestamp', 'bar', 'date']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar', 'date', 'baz']);
      });
    });

    describe(`#setField('index')`, () => {
      describe('auto-sourceFiltering', () => {
        describe('new index pattern assigned', () => {
          test('generates a searchSource filter', async () => {
            expect(searchSource.getField('index')).toBe(undefined);
            expect(searchSource.getField('source')).toBe(undefined);
            searchSource.setField('index', indexPattern);
            expect(searchSource.getField('index')).toBe(indexPattern);
            const request = await searchSource.getSearchRequestBody();
            expect(request._source).toBe(mockSource);
          });

          test('removes created searchSource filter on removal', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', undefined);
            const request = await searchSource.getSearchRequestBody();
            expect(request._source).toBe(undefined);
          });
        });

        describe('new index pattern assigned over another', () => {
          test('replaces searchSource filter with new', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', indexPattern2);
            expect(searchSource.getField('index')).toBe(indexPattern2);
            const request = await searchSource.getSearchRequestBody();
            expect(request._source).toBe(mockSource2);
          });

          test('removes created searchSource filter on removal', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', indexPattern2);
            searchSource.setField('index', undefined);
            const request = await searchSource.getSearchRequestBody();
            expect(request._source).toBe(undefined);
          });
        });
      });
    });
  });

  describe('#onRequestStart()', () => {
    test('should be called when starting a request', async () => {
      searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const fn = jest.fn();
      searchSource.onRequestStart(fn);
      const options = {};
      await searchSource.fetch(options);
      expect(fn).toBeCalledWith(searchSource, options);
    });

    test('should not be called on parent searchSource', async () => {
      const parent = new SearchSource({}, searchSourceDependencies);
      searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);

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
      searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies).setParent(
        parent,
        {
          callParentStartHandlers: true,
        }
      );

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
      searchSourceDependencies = {
        ...searchSourceDependencies,
        getConfig: jest.fn(() => {
          return true; // batchSearches = true
        }) as GetConfigFn,
      };
    });

    test('should call msearch', async () => {
      searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const options = {};
      await searchSource.fetch(options);
      expect(fetchSoon).toBeCalledTimes(1);
    });
  });

  describe('#search service fetch()', () => {
    test('should call msearch', async () => {
      searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
      const options = {};

      await searchSource.fetch(options);
      expect(mockSearchMethod).toBeCalledTimes(1);
    });
  });

  describe('#serialize', () => {
    test('should reference index patterns', () => {
      const indexPattern123 = { id: '123' } as IndexPattern;
      searchSource.setField('index', indexPattern123);
      const { searchSourceJSON, references } = searchSource.serialize();
      expect(references[0].id).toEqual('123');
      expect(references[0].type).toEqual('index-pattern');
      expect(JSON.parse(searchSourceJSON).indexRefName).toEqual(references[0].name);
    });

    test('should add other fields', () => {
      searchSource.setField('highlightAll', true);
      searchSource.setField('from', 123456);
      const { searchSourceJSON } = searchSource.serialize();
      expect(JSON.parse(searchSourceJSON).highlightAll).toEqual(true);
      expect(JSON.parse(searchSourceJSON).from).toEqual(123456);
    });

    test('should omit sort and size', () => {
      searchSource.setField('highlightAll', true);
      searchSource.setField('from', 123456);
      searchSource.setField('sort', { field: SortDirection.asc });
      searchSource.setField('size', 200);
      const { searchSourceJSON } = searchSource.serialize();
      expect(Object.keys(JSON.parse(searchSourceJSON))).toEqual(['highlightAll', 'from']);
    });

    test('should serialize filters', () => {
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
