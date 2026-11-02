/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { Elasticsearch } from './elasticsearch';
import { EsqlInputSchema, RequestInputSchema, SearchInputSchema } from './types';

const CLUSTER_URL = 'https://my-deployment.es.us-east-1.aws.elastic.cloud';

describe('Elasticsearch connector', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { url: CLUSTER_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const jsonResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Metadata
  // ============================================================================

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(Elasticsearch.metadata.id).toBe('.elasticsearch');
      expect(Elasticsearch.metadata.displayName).toBe('External Elasticsearch');
    });

    it('only declares agentBuilder support (new connector, pre Production-NonCanary)', () => {
      expect(Elasticsearch.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('requires enterprise license', () => {
      expect(Elasticsearch.metadata.minimumLicense).toBe('enterprise');
    });
  });

  // ============================================================================
  // Auth
  // ============================================================================

  describe('auth', () => {
    it('offers api_key_header (recommended) and basic', () => {
      const types = Elasticsearch.auth?.types ?? [];
      const apiKeyAuth = types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'api_key_header'
      );
      const basicAuth = types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'basic'
      );
      expect(apiKeyAuth?.isRecommended).toBe(true);
      expect(basicAuth).toBeDefined();
    });

    it('marks both auth types as sandbox capable', () => {
      const types = Elasticsearch.auth?.types ?? [];
      expect(types).toEqual([
        expect.objectContaining({ type: 'api_key_header', supportsSandbox: true }),
        expect.objectContaining({ type: 'basic', supportsSandbox: true }),
      ]);
    });
  });

  // ============================================================================
  // search
  // ============================================================================

  describe('search', () => {
    it('sends a POST to the _search endpoint with the query body', async () => {
      const hits = [{ _id: 'doc-1', _source: { message: 'hello' } }];
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits, total: { value: 1 } } }));

      const result = await Elasticsearch.actions.search.handler(mockContext, {
        index: 'my-index',
        query: { match: { message: 'hello' } },
        size: 10,
        from: 0,
        timeout: '30s',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${CLUSTER_URL}/my-index/_search`,
          method: 'POST',
          data: expect.objectContaining({ query: { match: { message: 'hello' } }, size: 10 }),
        })
      );
      expect(result).toEqual({ hits: { hits, total: { value: 1 } } });
    });

    it('URL-encodes the index name', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await Elasticsearch.actions.search.handler(mockContext, {
        index: 'logs/2024',
        query: { match_all: {} },
        size: 10,
        from: 0,
        timeout: '30s',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${CLUSTER_URL}/logs%2F2024/_search` })
      );
    });

    it('joins an array of index names with commas', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await Elasticsearch.actions.search.handler(mockContext, {
        index: ['index-a', 'index-b'],
        query: { match_all: {} },
        size: 10,
        from: 0,
        timeout: '30s',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${CLUSTER_URL}/index-a%2Cindex-b/_search` })
      );
    });

    it('includes optional sort, _source, and aggs fields when provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await Elasticsearch.actions.search.handler(mockContext, {
        index: 'my-index',
        query: { match_all: {} },
        size: 5,
        from: 0,
        timeout: '30s',
        sort: [{ '@timestamp': { order: 'desc' } }],
        _source: ['message', 'host.name'],
        aggs: { count_by_host: { terms: { field: 'host.name' } } },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sort: [{ '@timestamp': { order: 'desc' } }],
            _source: ['message', 'host.name'],
            aggs: { count_by_host: { terms: { field: 'host.name' } } },
          }),
        })
      );
    });
  });

  // ============================================================================
  // esql
  // ============================================================================

  describe('esql', () => {
    it('sends a POST to /_query with the query body', async () => {
      const esqlResponse = { columns: [{ name: 'count', type: 'long' }], values: [[42]] };
      mockRequest.mockResolvedValue(jsonResponse(esqlResponse));

      const result = await Elasticsearch.actions.esql.handler(mockContext, {
        query: 'FROM logs-* | STATS count = COUNT(*)',
        dropNullColumns: false,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${CLUSTER_URL}/_query`,
          method: 'POST',
          data: expect.objectContaining({ query: 'FROM logs-* | STATS count = COUNT(*)' }),
        })
      );
      // drop_null_columns must NOT be sent when false (ES 9.x rejects unknown fields)
      expect(mockRequest.mock.calls[0][0].data).not.toHaveProperty('drop_null_columns');
      expect(result).toEqual(esqlResponse);
    });

    it('passes optional filter and locale when provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ columns: [], values: [] }));

      await Elasticsearch.actions.esql.handler(mockContext, {
        query: 'FROM logs-*',
        filter: { term: { 'host.name': 'server-1' } },
        locale: 'en-US',
        dropNullColumns: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: { term: { 'host.name': 'server-1' } },
            locale: 'en-US',
            drop_null_columns: true,
          }),
        })
      );
    });
  });

  // ============================================================================
  // listIndices
  // ============================================================================

  describe('listIndices', () => {
    it('calls /_cat/indices with json format when no pattern provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse([]));

      await Elasticsearch.actions.listIndices.handler(mockContext, {
        pattern: '*',
        includeHidden: false,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${CLUSTER_URL}/_cat/indices`,
          method: 'GET',
          params: expect.objectContaining({ format: 'json' }),
        })
      );
    });

    it('includes the pattern in the path when provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse([]));

      await Elasticsearch.actions.listIndices.handler(mockContext, {
        pattern: 'logs-*',
        includeHidden: false,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${CLUSTER_URL}/_cat/indices/logs-*` })
      );
    });
  });

  // ============================================================================
  // getMapping
  // ============================================================================

  describe('getMapping', () => {
    it('calls the _field_caps endpoint with fields as a query param', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ indices: ['my-index'], fields: {} }));

      await Elasticsearch.actions.getMapping.handler(mockContext, {
        index: 'my-index',
        fields: ['*'],
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${CLUSTER_URL}/my-index/_field_caps`,
          method: 'GET',
          params: expect.objectContaining({ fields: '*' }),
        })
      );
    });

    it('URL-encodes the index name', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ indices: [], fields: {} }));

      await Elasticsearch.actions.getMapping.handler(mockContext, {
        index: 'my/index',
        fields: ['*'],
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${CLUSTER_URL}/my%2Findex/_field_caps` })
      );
    });

    it('joins multiple field patterns with commas', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ indices: [], fields: {} }));

      await Elasticsearch.actions.getMapping.handler(mockContext, {
        index: 'my-index',
        fields: ['@timestamp', 'message', 'host.*'],
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ fields: '@timestamp,message,host.*' }),
        })
      );
    });
  });

  // ============================================================================
  // request (generic escape hatch)
  // ============================================================================

  describe('request', () => {
    it('sends a GET to the provided path', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ status: 'green' }));

      const result = await Elasticsearch.actions.request.handler(mockContext, {
        path: '/_cluster/health',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${CLUSTER_URL}/_cluster/health`,
          method: 'GET',
        })
      );
      expect(result).toEqual({ status: 'green' });
    });

    it('passes queryParams as URL params', async () => {
      mockRequest.mockResolvedValue(jsonResponse({}));

      await Elasticsearch.actions.request.handler(mockContext, {
        path: '/_cat/indices',
        queryParams: { format: 'json', v: true },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: { format: 'json', v: true } })
      );
    });
  });

  // ============================================================================
  // getClusterInfo
  // ============================================================================

  describe('getClusterInfo', () => {
    it('sends a GET to /', async () => {
      mockRequest.mockResolvedValue(
        jsonResponse({ name: 'node-1', cluster_name: 'my-cluster', version: { number: '8.14.0' } })
      );

      await Elasticsearch.actions.getClusterInfo.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${CLUSTER_URL}/`, method: 'GET' })
      );
    });
  });

  // ============================================================================
  // Test handler
  // ============================================================================

  describe('test handler', () => {
    it('returns a success message with cluster name and version', async () => {
      mockRequest.mockResolvedValue(
        jsonResponse({ cluster_name: 'my-cluster', version: { number: '8.14.0' } })
      );

      const result = await Elasticsearch.test.handler(mockContext);

      expect(result.message).toMatch('my-cluster');
      expect(result.message).toMatch('8.14.0');
    });
  });

  // ============================================================================
  // Schema validation
  // ============================================================================

  describe('SearchInputSchema', () => {
    it('rejects index strings longer than 4096 characters', () => {
      const longIndex = 'a'.repeat(4097);
      const result = SearchInputSchema.safeParse({ index: longIndex });
      expect(result.success).toBe(false);
    });

    it('accepts a comma-separated list of several maximum-length index names', () => {
      const indices = Array.from({ length: 10 }, (_, i) => `${i}`.padEnd(255, 'a')).join(',');
      const result = SearchInputSchema.safeParse({ index: indices });
      expect(result.success).toBe(true);
    });

    it('accepts an array of 100 indices', () => {
      const indices = Array.from({ length: 100 }, (_, i) => `index-${i}`);
      const result = SearchInputSchema.safeParse({ index: indices });
      expect(result.success).toBe(true);
    });

    it('leaves the request line limit to the cluster, which can raise it above 4kb', () => {
      // 16 x 255 characters + 15 commas is 4095 raw; each comma encodes to %2C.
      const indices = Array.from({ length: 16 }, (_, i) => `${i}`.padEnd(255, 'a'));
      expect(SearchInputSchema.safeParse({ index: indices.join(',') }).success).toBe(true);
      expect(SearchInputSchema.safeParse({ index: indices }).success).toBe(true);
    });

    it('rejects arrays of more than 100 indices', () => {
      const tooManyIndices = Array.from({ length: 101 }, (_, i) => `index-${i}`);
      const result = SearchInputSchema.safeParse({ index: tooManyIndices });
      expect(result.success).toBe(false);
    });

    it('accepts a valid single index string', () => {
      const result = SearchInputSchema.safeParse({ index: 'logs-*' });
      expect(result.success).toBe(true);
    });

    it.each([
      [{ size: 10_000, from: 0 }, true],
      [{ size: 0, from: 10_000 }, true],
      [{ size: 500, from: 9_900 }, true],
      [{ size: 10_001, from: 0 }, false],
      [{ size: 0, from: 10_001 }, false],
    ])(
      'caps from and size separately, leaving from + size to the index result window: %j valid=%s',
      (window, expected) => {
        expect(SearchInputSchema.safeParse({ index: 'logs-*', ...window }).success).toBe(expected);
      }
    );

    it('rejects an index that cannot be URL-encoded instead of throwing', () => {
      expect(SearchInputSchema.safeParse({ index: '\ud800' }).success).toBe(false);
      expect(SearchInputSchema.safeParse({ index: ['logs', '\ud800'] }).success).toBe(false);
    });

    it.each([
      ['sort', (n: number) => Array.from({ length: n }, (_, i) => ({ [`f${i}`]: 'asc' }))],
      ['_source', (n: number) => Array.from({ length: n }, (_, i) => `f${i}`)],
      [
        'aggs',
        (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`a${i}`, {}])),
      ],
      [
        'runtimeMappings',
        (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`r${i}`, {}])),
      ],
    ])('accepts up to 1000 %s entries', (field, build) => {
      expect(SearchInputSchema.safeParse({ index: 'logs-*', [field]: build(1000) }).success).toBe(
        true
      );
      expect(SearchInputSchema.safeParse({ index: 'logs-*', [field]: build(1001) }).success).toBe(
        false
      );
    });

    it('defaults query to match_all when omitted', () => {
      const result = SearchInputSchema.safeParse({ index: 'logs-*' });
      expect(result.success).toBe(true);
      expect(result.success && result.data.query).toEqual({ match_all: {} });
    });

    it('accepts exactly one top-level query type', () => {
      const parse = (query: Record<string, unknown>) =>
        SearchInputSchema.safeParse({ index: 'logs-*', query }).success;
      expect(parse({ bool: { must: [{ match: { message: 'a' } }] } })).toBe(true);
      expect(parse({})).toBe(false);
      expect(parse({ match: { message: 'a' }, term: { 'host.name': 'b' } })).toBe(false);
    });
  });

  describe('RequestInputSchema', () => {
    it('accepts a path starting with /', () => {
      const result = RequestInputSchema.safeParse({ path: '/_cluster/health' });
      expect(result.success).toBe(true);
    });

    it('rejects a path not starting with /', () => {
      const result = RequestInputSchema.safeParse({ path: 'cluster/health' });
      expect(result.success).toBe(false);
    });

    it('rejects a path that could redirect requests to another host', () => {
      const result = RequestInputSchema.safeParse({ path: '@evil.com/_search' });
      expect(result.success).toBe(false);
    });

    it('leaves the request line limit to the cluster, which can raise it above 4kb', () => {
      const queryParams = { q: 'x'.repeat(2048), filter_path: 'x'.repeat(2048) };
      expect(RequestInputSchema.safeParse({ path: '/_search', queryParams }).success).toBe(true);
      // Each 'é' is sent as %C3%A9, six bytes on the wire.
      expect(RequestInputSchema.safeParse({ path: `/_search?q=${'é'.repeat(700)}` }).success).toBe(
        true
      );
    });

    it('rejects paths longer than 4096 characters', () => {
      expect(RequestInputSchema.safeParse({ path: `/${'a'.repeat(4095)}` }).success).toBe(true);
      expect(RequestInputSchema.safeParse({ path: `/${'a'.repeat(4096)}` }).success).toBe(false);
    });

    it('rejects an unparsable path instead of throwing', () => {
      expect(RequestInputSchema.safeParse({ path: ':bad' }).success).toBe(false);
    });
  });

  describe('EsqlInputSchema', () => {
    it('accepts up to 1000 params', () => {
      const params = (n: number) => Array.from({ length: n }, (_, i) => i);
      expect(EsqlInputSchema.safeParse({ query: 'FROM a', params: params(1000) }).success).toBe(
        true
      );
      expect(EsqlInputSchema.safeParse({ query: 'FROM a', params: params(1001) }).success).toBe(
        false
      );
    });

    it('accepts queries up to the 1,000,000-character ES|QL parser limit', () => {
      expect(EsqlInputSchema.safeParse({ query: 'x'.repeat(1_000_000) }).success).toBe(true);
      expect(EsqlInputSchema.safeParse({ query: 'x'.repeat(1_000_001) }).success).toBe(false);
    });

    it('accepts a filter with exactly one top-level query type', () => {
      const parse = (filter: Record<string, unknown>) =>
        EsqlInputSchema.safeParse({ query: 'FROM a', filter }).success;
      expect(parse({ range: { '@timestamp': { gte: 'now-1h' } } })).toBe(true);
      expect(parse({})).toBe(false);
      expect(parse({ range: { '@timestamp': { gte: 'now-1h' } }, term: { a: 'b' } })).toBe(false);
    });
  });
});
