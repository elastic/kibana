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

  it('should return document as a body for elasticsearch.index step', () => {
    const result = buildElasticsearchRequest('elasticsearch.index', {
      index: 'test-index',
      id: '1',
      document: { name: 'Yellowstone' },
    });
    expect(result.method).toBe('POST');
    expect(result.path).toBe('/test-index/_doc/1');
    expect(result.body).toEqual({ document: { name: 'Yellowstone' } });
  });
});
