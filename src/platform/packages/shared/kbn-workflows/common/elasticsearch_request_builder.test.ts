/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildElasticsearchRequest } from './elasticsearch_request_builder';

describe('buildElasticsearchRequest', () => {
  it('should pass through raw API format', () => {
    const result = buildElasticsearchRequest('elasticsearch.request', {
      method: 'GET',
      path: '/test-index/_search',
      body: { query: { match: { message: 'test' } }, size: 10 },
    });

    expect(result.method).toBe('GET');
    expect(result.path).toBe('/test-index/_search');
    expect(result.body).toEqual({ query: { match: { message: 'test' } }, size: 10 });
  });

  it('should build request from step configuration', () => {
    const result = buildElasticsearchRequest('elasticsearch.search', {
      index: 'test-index',
      query: { match: { message: 'test' } },
      size: 10,
    });

    expect(result.method).toBe('GET');
    expect(result.path).toBe('/test-index/_search');
    expect(result.body).toEqual({ query: { match: { message: 'test' } }, size: 10 });
  });

  it('should return special bulk body for elasticsearch.bulk step', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      operations: [{ index: { _index: 'test-index' } }, { message: 'test' }],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([{ index: { _index: 'test-index' } }, { message: 'test' }]);
  });

  it('should wrap bare documents with stable _id when id_field is provided', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      id_field: 'id',
      operations: [
        { id: 'a', message: 'a' },
        { id: 'b', message: 'b' },
        { id: 'c', message: 'c' },
      ],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([
      { index: { _id: 'a' } },
      { id: 'a', message: 'a' },
      { index: { _id: 'b' } },
      { id: 'b', message: 'b' },
      { index: { _id: 'c' } },
      { id: 'c', message: 'c' },
    ]);
  });

  it('should ignore id_field when operations are explicit bulk operation rows', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      id_field: 'id',
      operations: [{ index: { _index: 'test-index' } }, { message: 'test' }],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([{ index: { _index: 'test-index' } }, { message: 'test' }]);
  });

  it('should throw when a document is missing the id_field', () => {
    expect(() =>
      buildElasticsearchRequest('elasticsearch.bulk', {
        index: 'test-index',
        id_field: 'id',
        operations: [{ id: 'a' }, { message: 'missing' }],
      })
    ).toThrow('Missing id_field "id" at document 1');
  });

  it('should throw when id_field value is an object', () => {
    expect(() =>
      buildElasticsearchRequest('elasticsearch.bulk', {
        index: 'test-index',
        id_field: 'id',
        operations: [
          { id: { repo: 'kibana', num: 1 }, v: 1 },
          { id: { repo: 'elasticsearch', num: 2 }, v: 2 },
        ],
      })
    ).toThrow('id_field "id" at document 0 must be a string, number, or boolean');
  });

  it('should throw when id_field value is an array', () => {
    expect(() =>
      buildElasticsearchRequest('elasticsearch.bulk', {
        index: 'test-index',
        id_field: 'id',
        operations: [
          { id: ['a', 'b'], v: 1 },
          { id: ['a,b'], v: 2 },
        ],
      })
    ).toThrow('id_field "id" at document 0 must be a string, number, or boolean');
  });

  it('should throw when id_field parameter is not a string', () => {
    expect(() =>
      buildElasticsearchRequest('elasticsearch.bulk', {
        index: 'test-index',
        id_field: 7 as unknown as string,
        operations: [{ id: 'a' }],
      })
    ).toThrow('id_field must be a string');
  });

  it('should coerce a non-string id_field value to a string', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      id_field: 'id',
      operations: [{ id: 42, message: 'numeric' }],
    });
    expect(result.bulkBody).toEqual([{ index: { _id: '42' } }, { id: 42, message: 'numeric' }]);
  });

  it('should not leak id_field into request body or query', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      id_field: 'id',
      operations: [{ id: '1' }],
    });
    expect(result.body).toBeUndefined();
    expect(result.query).toBeUndefined();
  });

  it('should support bulk operations in old format with just documents in operations', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      operations: [{ message: 'test' }, { field1: 'value1' }, { field2: 'value2' }],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([
      { index: {} },
      { message: 'test' },
      { index: {} },
      { field1: 'value1' },
      { index: {} },
      { field2: 'value2' },
    ]);
  });

  it('should handle complex bulk operations with index, create, update, delete, script, upsert', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      operations: [
        { index: { _index: 'test-index' } },
        { message: 'test' },
        { create: { _index: 'test-index' } },
        { message: 'test' },
        { update: { _index: 'test-index' } },
        { doc: { message: 'test' } },
        { delete: { _index: 'test-index' } },
        { update: { _id: '0', _index: 'index1', retry_on_conflict: 3 } },
        {
          script: {
            source: 'ctx._source.counter += params.param1',
            lang: 'painless',
            params: { param1: 1 },
          },
          upsert: { counter: 1 },
        },
      ],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([
      { index: { _index: 'test-index' } },
      { message: 'test' },
      { create: { _index: 'test-index' } },
      { message: 'test' },
      { update: { _index: 'test-index' } },
      { doc: { message: 'test' } },
      { delete: { _index: 'test-index' } },
      { update: { _id: '0', _index: 'index1', retry_on_conflict: 3 } },
      {
        script: {
          source: 'ctx._source.counter += params.param1',
          lang: 'painless',
          params: { param1: 1 },
        },
        upsert: { counter: 1 },
      },
    ]);
  });

  it('should handle complex bulk operations with update, script, upsert', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      operations: [
        { update: { _id: '0', _index: 'index1', retry_on_conflict: 3 } },
        {
          script: {
            source: 'ctx._source.counter += params.param1',
            lang: 'painless',
            params: { param1: 1 },
          },
          upsert: { counter: 1 },
        },
      ],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([
      { update: { _id: '0', _index: 'index1', retry_on_conflict: 3 } },
      {
        script: {
          source: 'ctx._source.counter += params.param1',
          lang: 'painless',
          params: { param1: 1 },
        },
        upsert: { counter: 1 },
      },
    ]);
  });

  it('should wrap the document in an index operation even if it has an operation key', () => {
    const result = buildElasticsearchRequest('elasticsearch.bulk', {
      index: 'test-index',
      operations: [{ message: 'test', index: 'custom-field' }],
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_bulk');
    expect(result.bulkBody).toEqual([{ index: {} }, { message: 'test', index: 'custom-field' }]);
  });

  it('should return document as a body for elasticsearch.index step', () => {
    const result = buildElasticsearchRequest('elasticsearch.index', {
      index: 'test-index',
      id: '1',
      document: { name: 'Yellowstone' },
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_doc/1');
    expect(result.body).toEqual({ name: 'Yellowstone' });
  });

  it('should use POST for elasticsearch.index step when id is not provided', () => {
    const result = buildElasticsearchRequest('elasticsearch.index', {
      index: 'test-index',
      document: { name: 'Yellowstone' },
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_doc');
    expect(result.body).toEqual({ name: 'Yellowstone' });
  });

  it('should throw for unknown step type', () => {
    expect(() => buildElasticsearchRequest('elasticsearch.nonexistent', {})).toThrow(
      'No connector definition found'
    );
  });

  it('should encode path parameters with encodeURIComponent', () => {
    const result = buildElasticsearchRequest('elasticsearch.search', {
      index: 'my index/special',
      query: { match_all: {} },
    });
    expect(result.path).toContain(encodeURIComponent('my index/special'));
    expect(result.path).not.toContain('my index/special');
  });

  it('should pass through raw request path as-is for elasticsearch.request', () => {
    const result = buildElasticsearchRequest('elasticsearch.request', {
      method: 'GET',
      path: '/_cluster/settings',
    });
    expect(result.path).toBe('/_cluster/settings');
  });

  it('should use default GET method for elasticsearch.request when method is omitted', () => {
    const result = buildElasticsearchRequest('elasticsearch.request', {
      path: '/_cat/indices',
    });
    expect(result.method).toBe('GET');
  });
});
