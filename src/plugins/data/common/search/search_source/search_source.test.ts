/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom, of, throwError } from 'rxjs';
import { IndexPattern } from '../..';
import { SearchSource, SearchSourceDependencies, SortDirection } from './';
import { AggConfigs, AggTypesRegistryStart } from '../../';
import { mockAggTypesRegistry } from '../aggs/test_helpers';
import { RequestResponder } from 'src/plugins/inspector/common';
import { switchMap } from 'rxjs/operators';
import { Filter } from '@kbn/es-query';

const getComputedFields = () => ({
  storedFields: [],
  scriptFields: {},
  docvalueFields: [],
  runtimeFields: {},
});

const mockSource = { excludes: ['foo-*'] };
const mockSource2 = { excludes: ['bar-*'] };

const indexPattern = {
  title: 'foo',
  fields: [{ name: 'foo-bar' }, { name: 'field1' }, { name: 'field2' }, { name: '_id' }],
  getComputedFields,
  getSourceFiltering: () => mockSource,
} as unknown as IndexPattern;

const indexPattern2 = {
  title: 'foo',
  getComputedFields,
  getSourceFiltering: () => mockSource2,
} as unknown as IndexPattern;

const fields3 = [{ name: 'foo-bar' }, { name: 'field1' }, { name: 'field2' }];
const indexPattern3 = {
  title: 'foo',
  fields: {
    getByName: (name: string) => {
      return fields3.find((field) => field.name === name);
    },
    filter: () => {
      return fields3;
    },
  },
  getComputedFields,
  getSourceFiltering: () => mockSource,
} as unknown as IndexPattern;

const runtimeFieldDef = {
  type: 'keyword',
  script: {
    source: "emit('hello world')",
  },
};

describe('SearchSource', () => {
  let mockSearchMethod: any;
  let searchSourceDependencies: SearchSourceDependencies;
  let searchSource: SearchSource;

  beforeEach(() => {
    const getConfigMock = jest
      .fn()
      .mockImplementation((param) => param === 'metaFields' && ['_type', '_source', '_id'])
      .mockName('getConfig');

    mockSearchMethod = jest
      .fn()
      .mockReturnValue(
        of(
          { rawResponse: { test: 1 }, isPartial: true, isRunning: true },
          { rawResponse: { test: 2 }, isPartial: false, isRunning: false }
        )
      );

    searchSourceDependencies = {
      getConfig: getConfigMock,
      search: mockSearchMethod,
      onResponse: (req, res) => res,
    };

    searchSource = new SearchSource({}, searchSourceDependencies);
  });

  describe('#getField()', () => {
    test('gets the value for the property', () => {
      searchSource.setField('aggs', { i: 5 });
      expect(searchSource.getField('aggs')).toStrictEqual({ i: 5 });
    });
  });

  describe('#getFields()', () => {
    test('gets the value for the property', () => {
      searchSource.setField('aggs', { i: 5 });
      expect(searchSource.getFields()).toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "i": 5,
          },
        }
      `);
    });
  });

  describe('#removeField()', () => {
    test('remove property', () => {
      searchSource = new SearchSource({}, searchSourceDependencies);
      searchSource.setField('aggs', { i: 5 });
      searchSource.removeField('aggs');
      expect(searchSource.getField('aggs')).toBeFalsy();
    });
  });

  describe('#setField() / #flatten', () => {
    test('sets the value for the property', () => {
      searchSource.setField('aggs', { i: 5 });
      expect(searchSource.getField('aggs')).toStrictEqual({ i: 5 });
    });

    test('sets the value for the property with AggConfigs', () => {
      const typesRegistry = mockAggTypesRegistry();

      const ac = new AggConfigs(indexPattern3, [{ type: 'avg', params: { field: 'field1' } }], {
        typesRegistry,
      });

      searchSource.setField('aggs', ac);
      const request = searchSource.getSearchRequestBody();
      expect(request.aggs).toStrictEqual({ '1': { avg: { field: 'field1' } } });
    });

    describe('computed fields handling', () => {
      test('still provides computed fields when no fields are specified', async () => {
        const runtimeFields = { runtime_field: runtimeFieldDef };
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['hello'],
            scriptFields: { world: {} },
            docvalueFields: ['@timestamp'],
            runtimeFields,
          }),
        } as unknown as IndexPattern);

        const request = searchSource.getSearchRequestBody();
        expect(request.stored_fields).toEqual(['hello']);
        expect(request.script_fields).toEqual({ world: {} });
        expect(request.fields).toEqual(['@timestamp']);
        expect(request.runtime_mappings).toEqual(runtimeFields);
      });

      test('never includes docvalue_fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp'],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['@timestamp']);
        searchSource.setField('fieldsFromSource', ['foo']);

        const request = searchSource.getSearchRequestBody();
        expect(request).not.toHaveProperty('docvalue_fields');
      });

      test('overrides computed docvalue fields with ones that are provided', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['hello'],
          }),
        } as unknown as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('docvalue_fields', ['world']);

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('docvalue_fields');
        expect(request.docvalue_fields).toEqual(['world']);
      });

      test('allows explicitly provided docvalue fields to override fields API when fetching fieldsFromSource', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'a', format: 'date_time' }],
          }),
        } as unknown as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('docvalue_fields', [{ field: 'b', format: 'date_time' }]);
        searchSource.setField('fields', ['c']);
        searchSource.setField('fieldsFromSource', ['a', 'b', 'd']);

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('docvalue_fields');
        expect(request._source.includes).toEqual(['c', 'a', 'b', 'd']);
        expect(request.docvalue_fields).toEqual([{ field: 'b', format: 'date_time' }]);
        expect(request.fields).toEqual(['c', { field: 'a', format: 'date_time' }]);
      });

      test('allows you to override computed fields if you provide a format', async () => {
        const indexPatternFields = indexPattern.fields;
        indexPatternFields.getByType = (type) => {
          return [];
        };
        searchSource.setField('index', {
          ...indexPattern,
          fields: indexPatternFields,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time' }],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', [{ field: 'hello', format: 'strict_date_time' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([{ field: 'hello', format: 'strict_date_time' }]);
      });

      test('injects a date format for computed docvalue fields if none is provided', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time' }],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello']);

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([{ field: 'hello', format: 'date_time' }]);
      });

      test('injects a date format for computed docvalue fields while merging other properties', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          fields: {
            getByType: () => {
              return [];
            },
          },
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: 'hello', format: 'date_time', a: 'test', b: 'test' }],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', [{ field: 'hello', a: 'a', c: 'c' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('fields');
        expect(request.fields).toEqual([
          { field: 'hello', format: 'date_time', a: 'a', b: 'test', c: 'c' },
        ]);
      });

      test('merges provided script fields with computed fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        // @ts-expect-error TS won't like using this field name, but technically it's possible.
        searchSource.setField('script_fields', { world: {} });

        const request = searchSource.getSearchRequestBody();
        expect(request).toHaveProperty('script_fields');
        expect(request.script_fields).toEqual({
          hello: {},
          world: {},
        });
      });

      test(`requests any fields that aren't script_fields from stored_fields`, async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello', 'a', { field: 'c' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a', 'c']);
      });

      test('ignores objects without a `field` property when setting stored_fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello', 'a', { foo: 'c' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a']);
      });

      test(`requests any fields that aren't script_fields from stored_fields with fieldsFromSource`, async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fieldsFromSource', ['hello', 'a']);

        const request = searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['a']);
      });

      test('defaults to * for stored fields when no fields are provided', async () => {
        const requestA = searchSource.getSearchRequestBody();
        expect(requestA.stored_fields).toEqual(['*']);

        searchSource.setField('fields', ['*']);
        const requestB = searchSource.getSearchRequestBody();
        expect(requestB.stored_fields).toEqual(['*']);
      });

      test('defaults to * for stored fields when no fields are provided with fieldsFromSource', async () => {
        searchSource.setField('fieldsFromSource', ['*']);
        const request = searchSource.getSearchRequestBody();
        expect(request.stored_fields).toEqual(['*']);
      });

      test('_source is not set when using the fields API', async () => {
        searchSource.setField('fields', ['*']);
        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['*']);
        expect(request._source).toEqual(false);
      });

      test('includes queries in the "filter" clause by default', async () => {
        searchSource.setField('query', {
          query: 'agent.keyword : "Mozilla" ',
          language: 'kuery',
        });
        const request = searchSource.getSearchRequestBody();
        expect(request.query).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "match_phrase": Object {
                          "agent.keyword": "Mozilla",
                        },
                      },
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          }
        `);
      });

      test('includes queries in the "must" clause if sorting by _score', async () => {
        searchSource.setField('query', {
          query: 'agent.keyword : "Mozilla" ',
          language: 'kuery',
        });
        searchSource.setField('sort', [{ _score: SortDirection.asc }]);
        const request = searchSource.getSearchRequestBody();
        expect(request.query).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [],
              "must": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "match_phrase": Object {
                          "agent.keyword": "Mozilla",
                        },
                      },
                    ],
                  },
                },
              ],
              "must_not": Array [],
              "should": Array [],
            },
          }
        `);
      });
    });

    describe('source filters handling', () => {
      test('excludes docvalue fields based on source filtering', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp', 'exclude-me'],
          }),
        } as unknown as IndexPattern);
        // @ts-expect-error Typings for excludes filters need to be fixed.
        searchSource.setField('source', { excludes: ['exclude-*'] });

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['@timestamp']);
      });

      test('defaults to source filters from index pattern', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: ['@timestamp', 'foo-bar', 'foo-baz'],
          }),
        } as unknown as IndexPattern);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['@timestamp']);
      });

      test('filters script fields to only include specified fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello']);

        const request = searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {} });
      });

      test('request all fields except the ones specified with source filters', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: [],
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', [
          'hello',
          'foo-bar',
          'foo--bar',
          'fooo',
          'somethingfoo',
          'xxfxxoxxo',
        ]);
        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['hello', 'fooo', 'somethingfoo', 'xxfxxoxxo']);
      });

      test('request all fields from index pattern except the ones specified with source filters', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: [],
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['*']);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual([{ field: 'field1' }, { field: 'field2' }]);
      });

      test('request all fields from index pattern except the ones specified with source filters with unmapped_fields option', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: [],
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', [{ field: '*', include_unmapped: 'true' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual([{ field: 'field1' }, { field: 'field2' }]);
      });

      test('excludes metafields from the request', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: [],
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', [{ field: '*', include_unmapped: 'true' }]);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual([{ field: 'field1' }, { field: 'field2' }]);

        searchSource.setField('fields', ['foo-bar', 'foo--bar', 'field1', 'field2']);
        expect(request.fields).toEqual([{ field: 'field1' }, { field: 'field2' }]);

        searchSource.removeField('fields');
        searchSource.setField('fieldsFromSource', ['foo-bar', 'foo--bar', 'field1', 'field2']);
        expect(request.fields).toEqual([{ field: 'field1' }, { field: 'field2' }]);
      });

      test('returns all scripted fields when one fields entry is *', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: [],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['timestamp', '*']);

        const request = searchSource.getSearchRequestBody();
        expect(request.script_fields).toEqual({ hello: {}, world: {} });
      });
    });

    describe('handling for when specific fields are provided', () => {
      test('fieldsFromSource will request any fields outside of script_fields from _source & stored fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp'],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fieldsFromSource', [
          'hello',
          'world',
          '@timestamp',
          'foo-a',
          'bar-b',
        ]);

        const request = searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar-b'],
        });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar-b']);
      });

      test('filters request when a specific list of fields is provided', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date'],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello', '@timestamp', 'foo-a', 'bar']);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual(['hello', '@timestamp', 'bar', 'date']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar']);
      });

      test('filters request when a specific list of fields is provided with fieldsFromSource', async () => {
        const runtimeFields = { runtime_field: runtimeFieldDef, runtime_field_b: runtimeFieldDef };
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date'],
            runtimeFields,
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fieldsFromSource', [
          'hello',
          '@timestamp',
          'foo-a',
          'bar',
          'runtime_field',
        ]);

        const request = searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar'],
        });
        expect(request.fields).toEqual(['@timestamp']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar']);
        expect(request.runtime_mappings).toEqual(runtimeFields);
      });

      test('filters request when a specific list of fields is provided with fieldsFromSource or fields', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: ['*'],
            scriptFields: { hello: {}, world: {} },
            docvalueFields: ['@timestamp', 'date', 'time'],
          }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['hello', '@timestamp', 'foo-a', 'bar']);
        searchSource.setField('fieldsFromSource', ['foo-b', 'date', 'baz']);

        const request = searchSource.getSearchRequestBody();
        expect(request._source).toEqual({
          includes: ['@timestamp', 'bar', 'date', 'baz'],
        });
        expect(request.fields).toEqual(['hello', '@timestamp', 'bar', 'date']);
        expect(request.script_fields).toEqual({ hello: {} });
        expect(request.stored_fields).toEqual(['@timestamp', 'bar', 'date', 'baz']);
      });
    });

    describe('handling date fields', () => {
      test('adds date format to any date field', async () => {
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: '@timestamp' }],
          }),
          fields: {
            getByType: () => [{ name: '@timestamp', esTypes: ['date_nanos'] }],
          },
          getSourceFiltering: () => ({ excludes: [] }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['*']);

        const request = searchSource.getSearchRequestBody();
        expect(request.fields).toEqual([
          '*',
          { field: '@timestamp', format: 'strict_date_optional_time_nanos' },
        ]);
      });

      test('adds date format to any date field except the one excluded by source filters', async () => {
        const indexPatternFields = indexPattern.fields;
        // @ts-ignore
        indexPatternFields.getByType = (type) => {
          return [
            { name: '@timestamp', esTypes: ['date_nanos'] },
            { name: 'custom_date', esTypes: ['date'] },
          ];
        };
        searchSource.setField('index', {
          ...indexPattern,
          getComputedFields: () => ({
            storedFields: [],
            scriptFields: {},
            docvalueFields: [{ field: '@timestamp' }, { field: 'custom_date' }],
          }),
          fields: indexPatternFields,
          getSourceFiltering: () => ({ excludes: ['custom_date'] }),
        } as unknown as IndexPattern);
        searchSource.setField('fields', ['*']);

        const request = searchSource.getSearchRequestBody();
        expect(request.hasOwnProperty('docvalue_fields')).toBe(false);
        expect(request.fields).toEqual([
          { field: 'foo-bar' },
          { field: 'field1' },
          { field: 'field2' },
          { field: '@timestamp', format: 'strict_date_optional_time_nanos' },
        ]);
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
            const request = searchSource.getSearchRequestBody();
            expect(request._source).toBe(mockSource);
          });

          test('removes created searchSource filter on removal', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', undefined);
            const request = searchSource.getSearchRequestBody();
            expect(request._source).toBe(undefined);
          });
        });

        describe('new index pattern assigned over another', () => {
          test('replaces searchSource filter with new', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', indexPattern2);
            expect(searchSource.getField('index')).toBe(indexPattern2);
            const request = searchSource.getSearchRequestBody();
            expect(request._source).toBe(mockSource2);
          });

          test('removes created searchSource filter on removal', async () => {
            searchSource.setField('index', indexPattern);
            searchSource.setField('index', indexPattern2);
            searchSource.setField('index', undefined);
            const request = searchSource.getSearchRequestBody();
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
      await searchSource.fetch$(options).toPromise();
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
      await searchSource.fetch$(options).toPromise();

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
      await searchSource.fetch$(options).toPromise();

      expect(fn).toBeCalledWith(searchSource, options);
      expect(parentFn).toBeCalledWith(searchSource, options);
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

    test('should omit size but not sort', () => {
      searchSource.setField('highlightAll', true);
      searchSource.setField('from', 123456);
      searchSource.setField('sort', { field: SortDirection.asc });
      searchSource.setField('size', 200);
      const { searchSourceJSON } = searchSource.serialize();
      expect(Object.keys(JSON.parse(searchSourceJSON))).toEqual(['highlightAll', 'from', 'sort']);
    });

    test('should serialize filters', () => {
      const filter = [
        {
          query: { query_string: { query: 'query' } },
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
          query: { query_string: { query: 'query' } },
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

    test('mvt geoshape layer test', async () => {
      // @ts-expect-error TS won't like using this field name, but technically it's possible.
      searchSource.setField('docvalue_fields', ['prop1']);
      searchSource.setField('source', ['geometry']);
      searchSource.setField('fieldsFromSource', ['geometry', 'prop1']);
      searchSource.setField('index', {
        ...indexPattern,
        getSourceFiltering: () => ({ excludes: [] }),
        getComputedFields: () => ({
          storedFields: ['*'],
          scriptFields: {},
          docvalueFields: [],
        }),
      } as unknown as IndexPattern);
      const request = searchSource.getSearchRequestBody();
      expect(request.stored_fields).toEqual(['geometry', 'prop1']);
      expect(request.docvalue_fields).toEqual(['prop1']);
      expect(request._source).toEqual(['geometry']);
    });
  });

  describe('getSerializedFields', () => {
    const filter: Filter[] = [
      {
        query: { query_string: { query: 'query' } },
        meta: {
          alias: 'alias',
          disabled: false,
          negate: false,
          index: '456',
        },
      },
    ];

    test('should return serialized fields', () => {
      const indexPattern123 = { id: '123' } as IndexPattern;
      searchSource.setField('index', indexPattern123);
      searchSource.setField('filter', () => {
        return filter;
      });
      const serializedFields = searchSource.getSerializedFields();
      expect(serializedFields).toMatchInlineSnapshot(
        { index: '123', filter },
        `
        Object {
          "filter": Array [
            Object {
              "meta": Object {
                "alias": "alias",
                "disabled": false,
                "index": "456",
                "negate": false,
              },
              "query": Object {
                "query_string": Object {
                  "query": "query",
                },
              },
            },
          ],
          "index": "123",
        }
      `
      );
    });

    test('should support nested search sources', () => {
      const indexPattern123 = { id: '123' } as IndexPattern;
      searchSource.setField('index', indexPattern123);
      searchSource.setField('from', 123);
      const childSearchSource = searchSource.createChild();
      childSearchSource.setField('timeout', '100');
      const serializedFields = childSearchSource.getSerializedFields(true);
      expect(serializedFields).toMatchInlineSnapshot(
        {
          timeout: '100',
          parent: {
            index: '123',
            from: 123,
          },
        },
        `
        Object {
          "parent": Object {
            "from": 123,
            "index": "123",
          },
          "timeout": "100",
        }
      `
      );
    });
  });

  describe('fetch$', () => {
    describe('responses', () => {
      test('should return partial results', async () => {
        searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
        const options = {};

        const next = jest.fn();
        const complete = jest.fn();
        const res$ = searchSource.fetch$(options);
        res$.subscribe({ next, complete });
        await res$.toPromise();

        expect(next).toBeCalledTimes(2);
        expect(complete).toBeCalledTimes(1);
        expect(next.mock.calls[0]).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "isPartial": true,
                      "isRunning": true,
                      "rawResponse": Object {
                        "test": 1,
                      },
                    },
                  ]
                `);
        expect(next.mock.calls[1]).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "isPartial": false,
                      "isRunning": false,
                      "rawResponse": Object {
                        "test": 2,
                      },
                    },
                  ]
                `);
      });

      test('shareReplays result', async () => {
        searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
        const options = {};

        const next = jest.fn();
        const complete = jest.fn();
        const next2 = jest.fn();
        const complete2 = jest.fn();
        const res$ = searchSource.fetch$(options);
        res$.subscribe({ next, complete });
        res$.subscribe({ next: next2, complete: complete2 });
        await res$.toPromise();

        expect(next).toBeCalledTimes(2);
        expect(next2).toBeCalledTimes(2);
        expect(complete).toBeCalledTimes(1);
        expect(complete2).toBeCalledTimes(1);
        expect(searchSourceDependencies.search).toHaveBeenCalledTimes(1);
      });

      test('should emit error on empty response', async () => {
        searchSourceDependencies.search = mockSearchMethod = jest
          .fn()
          .mockReturnValue(
            of({ rawResponse: { test: 1 }, isPartial: true, isRunning: true }, undefined)
          );

        searchSource = new SearchSource({ index: indexPattern }, searchSourceDependencies);
        const options = {};

        const next = jest.fn();
        const error = jest.fn();
        const complete = jest.fn();
        const res$ = searchSource.fetch$(options);
        res$.subscribe({ next, error, complete });
        await res$.toPromise().catch((e) => {});

        expect(next).toBeCalledTimes(1);
        expect(error).toBeCalledTimes(1);
        expect(complete).toBeCalledTimes(0);
        expect(next.mock.calls[0][0].rawResponse).toStrictEqual({
          test: 1,
        });
        expect(error.mock.calls[0][0]).toBe(undefined);
      });
    });

    describe('inspector', () => {
      let requestResponder: RequestResponder;
      beforeEach(() => {
        requestResponder = {
          stats: jest.fn(),
          ok: jest.fn(),
          error: jest.fn(),
          json: jest.fn(),
        } as unknown as RequestResponder;
      });

      test('calls inspector if provided', async () => {
        const options = {
          inspector: {
            title: 'a',
            adapter: {
              start: jest.fn().mockReturnValue(requestResponder),
            } as any,
          },
        };

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        await searchSource.fetch$(options).toPromise();

        expect(options.inspector.adapter.start).toBeCalledTimes(1);
        expect(requestResponder.error).not.toBeCalled();
        expect(requestResponder.json).toBeCalledTimes(1);
        expect(requestResponder.ok).toBeCalledTimes(1);
        // First and last
        expect(requestResponder.stats).toBeCalledTimes(2);
      });

      test('calls inspector only once, with multiple subs (shareReplay)', async () => {
        const options = {
          inspector: {
            title: 'a',
            adapter: {
              start: jest.fn().mockReturnValue(requestResponder),
            } as any,
          },
        };

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        const res$ = searchSource.fetch$(options);

        const complete1 = jest.fn();
        const complete2 = jest.fn();

        res$.subscribe({
          complete: complete1,
        });
        res$.subscribe({
          complete: complete2,
        });

        await res$.toPromise();

        expect(complete1).toBeCalledTimes(1);
        expect(complete2).toBeCalledTimes(1);
        expect(options.inspector.adapter.start).toBeCalledTimes(1);
      });

      test('calls error on inspector', async () => {
        const options = {
          inspector: {
            title: 'a',
            adapter: {
              start: jest.fn().mockReturnValue(requestResponder),
            } as any,
          },
        };

        searchSourceDependencies.search = jest.fn().mockReturnValue(throwError('aaaaa'));

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        await searchSource
          .fetch$(options)
          .toPromise()
          .catch(() => {});

        expect(options.inspector.adapter.start).toBeCalledTimes(1);
        expect(requestResponder.json).toBeCalledTimes(1);
        expect(requestResponder.error).toBeCalledTimes(1);
        expect(requestResponder.ok).toBeCalledTimes(0);
        expect(requestResponder.stats).toBeCalledTimes(0);
      });
    });

    describe('postFlightRequest', () => {
      let fetchSub: any;

      function getAggConfigs(typesRegistry: AggTypesRegistryStart, enabled: boolean) {
        return new AggConfigs(
          indexPattern3,
          [
            {
              type: 'avg',
              enabled,
              params: { field: 'field1' },
            },
          ],
          {
            typesRegistry,
          }
        );
      }

      beforeEach(() => {
        fetchSub = {
          next: jest.fn(),
          complete: jest.fn(),
          error: jest.fn(),
        };
      });

      test('doesnt call any post flight requests if disabled', async () => {
        const typesRegistry = mockAggTypesRegistry();
        typesRegistry.get('avg').postFlightRequest = jest.fn();
        const ac = getAggConfigs(typesRegistry, false);

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        searchSource.setField('aggs', ac);
        const fetch$ = searchSource.fetch$({});
        fetch$.subscribe(fetchSub);
        await fetch$.toPromise();

        expect(fetchSub.next).toHaveBeenCalledTimes(2);
        expect(fetchSub.complete).toHaveBeenCalledTimes(1);
        expect(fetchSub.error).toHaveBeenCalledTimes(0);

        expect(typesRegistry.get('avg').postFlightRequest).toHaveBeenCalledTimes(0);
      });

      test('doesnt call any post flight if searchsource has error', async () => {
        const typesRegistry = mockAggTypesRegistry();
        typesRegistry.get('avg').postFlightRequest = jest.fn();
        const ac = getAggConfigs(typesRegistry, true);

        searchSourceDependencies.search = jest.fn().mockImplementation(() =>
          of(1).pipe(
            switchMap((r) => {
              throw r;
            })
          )
        );

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        searchSource.setField('aggs', ac);
        const fetch$ = searchSource.fetch$({});
        fetch$.subscribe(fetchSub);
        await fetch$.toPromise().catch((e) => {});

        expect(fetchSub.next).toHaveBeenCalledTimes(0);
        expect(fetchSub.complete).toHaveBeenCalledTimes(0);
        expect(fetchSub.error).toHaveBeenNthCalledWith(1, 1);

        expect(typesRegistry.get('avg').postFlightRequest).toHaveBeenCalledTimes(0);
      });

      test('calls post flight requests, fires 1 extra response, returns last response', async () => {
        const typesRegistry = mockAggTypesRegistry();
        typesRegistry.get('avg').postFlightRequest = jest.fn().mockResolvedValue({
          other: 5,
        });

        const allac = new AggConfigs(
          indexPattern3,
          [
            {
              type: 'avg',
              enabled: true,
              params: { field: 'field1' },
            },
            {
              type: 'avg',
              enabled: true,
              params: { field: 'field2' },
            },
            {
              type: 'avg',
              enabled: true,
              params: { field: 'foo-bar' },
            },
          ],
          {
            typesRegistry,
          }
        );

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        searchSource.setField('aggs', allac);
        const fetch$ = searchSource.fetch$({});
        fetch$.subscribe(fetchSub);

        const resp = await lastValueFrom(fetch$);

        expect(fetchSub.next).toHaveBeenCalledTimes(3);
        expect(fetchSub.complete).toHaveBeenCalledTimes(1);
        expect(fetchSub.error).toHaveBeenCalledTimes(0);
        expect(resp.rawResponse).toStrictEqual({ other: 5 });
        expect(typesRegistry.get('avg').postFlightRequest).toHaveBeenCalledTimes(3);
      });

      test('calls post flight requests only once, with multiple subs (shareReplay)', async () => {
        const typesRegistry = mockAggTypesRegistry();
        typesRegistry.get('avg').postFlightRequest = jest.fn().mockResolvedValue({
          other: 5,
        });

        const allac = new AggConfigs(
          indexPattern3,
          [
            {
              type: 'avg',
              enabled: true,
              params: { field: 'field1' },
            },
          ],
          {
            typesRegistry,
          }
        );

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        searchSource.setField('aggs', allac);
        const fetch$ = searchSource.fetch$({});
        fetch$.subscribe(fetchSub);

        const fetchSub2 = {
          next: jest.fn(),
          complete: jest.fn(),
          error: jest.fn(),
        };
        fetch$.subscribe(fetchSub2);

        await fetch$.toPromise();

        expect(fetchSub.next).toHaveBeenCalledTimes(3);
        expect(fetchSub.complete).toHaveBeenCalledTimes(1);
        expect(typesRegistry.get('avg').postFlightRequest).toHaveBeenCalledTimes(1);
      });

      test('calls post flight requests, handles error', async () => {
        const typesRegistry = mockAggTypesRegistry();
        typesRegistry.get('avg').postFlightRequest = jest.fn().mockRejectedValue(undefined);
        const ac = getAggConfigs(typesRegistry, true);

        searchSource = new SearchSource({}, searchSourceDependencies);
        searchSource.setField('index', indexPattern);
        searchSource.setField('aggs', ac);
        const fetch$ = searchSource.fetch$({});
        fetch$.subscribe(fetchSub);

        await fetch$.toPromise().catch(() => {});

        expect(fetchSub.next).toHaveBeenCalledTimes(2);
        expect(fetchSub.complete).toHaveBeenCalledTimes(0);
        expect(fetchSub.error).toHaveBeenCalledTimes(1);
        expect(typesRegistry.get('avg').postFlightRequest).toHaveBeenCalledTimes(1);
      });
    });
  });
});
