/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import API from '@elastic/elasticsearch/lib/api/index';
import { coreMock } from '@kbn/core/public/mocks';
import { EsClientPlugin } from '../plugin';
import type { EsClient } from './types';

const ELASTICSEARCH_WARNING = '299 Elasticsearch-9.0.0 "this request accesses system indices"';
const DEPRECATION_WARNING = '299 Elasticsearch-9.0.0 "[q] is deprecated, use [query]"';
const WARNING_HEADER = `${ELASTICSEARCH_WARNING}, 199 agent "other", ${DEPRECATION_WARNING}`;
const KIBANA_ORIGIN = { 'x-elastic-product-origin': 'kibana' } as const;
const NDJSON = { ...KIBANA_ORIGIN, 'Content-Type': 'application/x-ndjson' } as const;

const setup = async () => {
  const coreSetup = coreMock.createSetup();
  const { fetch } = coreSetup.http;
  fetch.mockResolvedValue({ response: new Response(), body: {} });
  const client = await new EsClientPlugin().setup(coreSetup).getClient();
  return { client, fetch };
};

const okResponse = (body: unknown, headers?: HeadersInit) => ({
  response: new Response(null, { status: 200, headers }),
  body,
});

const fetchError = (status: number, body?: object) => {
  const response = new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  return Object.assign(new Error('Request failed'), {
    name: 'HttpFetchError',
    request: {},
    response,
    body,
  });
};

const { signal } = new AbortController();

describe('WHEN using the elasticsearch-js client through the proxy', () => {
  it('SHOULD expose every elasticsearch-js API', async () => {
    const { client } = await setup();
    const apiNames = Object.keys(Object.getOwnPropertyDescriptors(API.prototype)).filter(
      (name) => name !== 'constructor'
    );

    expect(apiNames.length).toBeGreaterThan(0);
    expect(apiNames.filter((name) => !(name in client))).toEqual([]);
  });

  it('SHOULD send searches as POST requests with a JSON body', async () => {
    const { client, fetch } = await setup();
    fetch.mockResolvedValue(okResponse({ hits: { hits: [] } }));

    const response = await client.search({ index: 'my-index', query: { match_all: {} } });

    expect(response).toEqual({ hits: { hits: [] } });
    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({
        method: 'POST',
        body: '{"query":{"match_all":{}}}',
        version: '1',
        asResponse: true,
        rawResponse: false,
      })
    );
  });

  it('SHOULD send raw requests through transport.request', async () => {
    const { client, fetch } = await setup();
    fetch.mockResolvedValue(okResponse({ acknowledged: true }));

    const response = await client.transport.request({
      method: 'POST',
      path: '/my-index/_forcemerge',
      querystring: { max_num_segments: 1 },
    });

    expect(response).toEqual({ acknowledged: true });
    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_forcemerge',
      expect.objectContaining({ method: 'POST', query: { max_num_segments: 1 } })
    );
  });

  it.each<[string, (client: EsClient) => Promise<unknown>, string, object]>([
    [
      'keep reserved characters in path parameters encoded',
      (client) => client.get({ index: 'my-index', id: 'a/b c' }),
      '/my-index/_doc/a%2Fb%20c',
      { method: 'GET' },
    ],
    [
      'send names that start with dots',
      (client) => client.get({ index: '.kibana', id: '..a' }),
      '/.kibana/_doc/..a',
      { method: 'GET' },
    ],
    [
      'send list query parameters as comma-separated values',
      (client) => client.search({ index: 'my-index', _source_includes: ['a', 'b'] }),
      '/my-index/_search',
      { query: { _source_includes: 'a,b' } },
    ],
    [
      'call namespaced APIs',
      (client) => client.indices.getMapping({ index: 'my-index' }),
      '/my-index/_mapping',
      { method: 'GET' },
    ],
    [
      'mark requests as coming from Kibana',
      (client) => client.indices.stats({ index: '*' }),
      '/*/_stats',
      { headers: KIBANA_ORIGIN },
    ],
    [
      'let the caller replace the product origin regardless of header case',
      (client) =>
        client.search({ index: 'my-index' }, { headers: { 'X-Elastic-Product-Origin': '' } }),
      '/my-index/_search',
      { headers: { 'x-elastic-product-origin': '' } },
    ],
    [
      'pass abort signals and normalize the content type header',
      (client) =>
        client.search(
          { index: 'my-index' },
          { signal, headers: { 'content-type': 'application/vnd.elasticsearch+json' } }
        ),
      '/my-index/_search',
      {
        signal,
        headers: { ...KIBANA_ORIGIN, 'Content-Type': 'application/vnd.elasticsearch+json' },
      },
    ],
    [
      'send bulk operations as ndjson',
      (client) =>
        client.bulk({
          index: 'my-index',
          refresh: true,
          operations: [{ index: { _id: '1' } }, { message: 'hello' }],
        }),
      '/my-index/_bulk',
      {
        method: 'POST',
        query: { refresh: true },
        body: '{"index":{"_id":"1"}}\n{"message":"hello"}\n',
        headers: NDJSON,
      },
    ],
    [
      'send a string bulk body as is to the root bulk API',
      (client) => client.bulk({ body: '{"delete":{"_index":"my-index","_id":"1"}}\n' }),
      '/_bulk',
      { body: '{"delete":{"_index":"my-index","_id":"1"}}\n', query: {} },
    ],
    [
      'send string bulk lines as is',
      (client) =>
        client.bulk<string>({
          operations: ['{"delete":{"_id":"1"}}', { delete: { _id: '2' } }],
        }),
      '/_bulk',
      { body: '{"delete":{"_id":"1"}}\n{"delete":{"_id":"2"}}\n' },
    ],
    [
      'send multi-search bodies as ndjson',
      (client) =>
        client.msearch({ searches: [{ index: 'my-index' }, { query: { match_all: {} } }] }),
      '/_msearch',
      { body: '{"index":"my-index"}\n{"query":{"match_all":{}}}\n', headers: NDJSON },
    ],
    [
      'merge string and object query strings of raw requests, skipping undefined values',
      (client) =>
        client.transport.request(
          { method: 'GET', path: '/_cat/indices', querystring: 'format=json&h=index' },
          { querystring: { bytes: 'b', s: undefined } }
        ),
      '/_cat/indices',
      { query: { format: 'json', h: 'index', bytes: 'b' } },
    ],
    [
      'join list headers of raw requests and skip undefined headers',
      (client) =>
        client.transport.request(
          { method: 'GET', path: '/' },
          { headers: { 'x-list': ['a', 'b'], 'x-skipped': undefined } }
        ),
      '/',
      { headers: { ...KIBANA_ORIGIN, 'x-list': 'a, b' } },
    ],
    [
      'keep an explicit content type for raw bulk bodies',
      (client) =>
        client.transport.request(
          { method: 'POST', path: '/_bulk', bulkBody: [{ delete: { _id: '1' } }] },
          { headers: { 'Content-Type': 'application/vnd.elasticsearch+x-ndjson' } }
        ),
      '/_bulk',
      {
        body: '{"delete":{"_id":"1"}}\n',
        headers: { ...KIBANA_ORIGIN, 'Content-Type': 'application/vnd.elasticsearch+x-ndjson' },
      },
    ],
    [
      'send a raw string body as is',
      (client) =>
        client.transport.request({ method: 'POST', path: '/_sql', body: '{"query":"x"}' }),
      '/_sql',
      { body: '{"query":"x"}' },
    ],
  ])('SHOULD %s', async (_name, call, esPath, expectedOptions) => {
    const { client, fetch } = await setup();

    await call(client);

    expect(fetch).toHaveBeenCalledWith(
      `/internal/es_client${esPath}`,
      expect.objectContaining(expectedOptions)
    );
  });

  it.each<[string, (client: EsClient) => Promise<unknown>, string]>([
    [
      'a buffer body',
      (client) =>
        client.transport.request({ method: 'POST', path: '/_bulk', body: Buffer.from([1]) }),
      'only sends string and JSON bodies',
    ],
    [
      'a stream body',
      (client) =>
        client.transport.request({
          method: 'POST',
          path: '/_bulk',
          body: { pipe: () => undefined },
        }),
      'only sends string and JSON bodies',
    ],
    [
      'a web stream body',
      (client) =>
        client.transport.request({
          method: 'POST',
          path: '/_bulk',
          body: { getReader: () => undefined },
        }),
      'only sends string and JSON bodies',
    ],
    [
      'a buffer bulk body',
      (client) =>
        client.transport.request({ method: 'POST', path: '/_bulk', bulkBody: Buffer.from([1]) }),
      'only sends string and JSON bodies',
    ],
    [
      'bulk calls without operations',
      (client) => client.bulk({ index: 'my-index' }),
      'Missing required parameter [operations]',
    ],
    [
      'methods the proxy does not support',
      (client) => client.transport.request({ method: 'PATCH', path: '/' }),
      'does not support the PATCH method',
    ],
    [
      'a ".." path parameter',
      (client) => client.delete({ index: 'my-index', id: '..' }),
      'cannot send /my-index/_doc/..: "." and ".." path segments are not supported',
    ],
    [
      'a "." path parameter',
      (client) => client.get({ index: 'my-index', id: '.' }),
      'path segments are not supported',
    ],
    [
      'a percent-encoded dot segment in a raw path',
      (client) => client.transport.request({ method: 'GET', path: '/my-index/_doc/.%2E' }),
      'path segments are not supported',
    ],
  ])('SHOULD reject %s without sending a request', async (_name, call, message) => {
    const { client, fetch } = await setup();

    await expect(call(client)).rejects.toThrow(message);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('SHOULD reject WHEN no response is received', async () => {
    const { client, fetch } = await setup();
    fetch.mockResolvedValue({ body: {} });

    await expect(client.transport.request({ method: 'GET', path: '/' })).rejects.toThrow(
      'No response received for GET /'
    );
  });

  describe('WHEN the meta option is set', () => {
    it('SHOULD resolve with the status, headers, warnings and request', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse({ count: 3 }, { warning: WARNING_HEADER }));

      const result = await client.count({ index: 'my-index', q: 'a b' }, { meta: true });

      expect(result).toEqual({
        body: { count: 3 },
        statusCode: 200,
        headers: { warning: WARNING_HEADER },
        warnings: [ELASTICSEARCH_WARNING, DEPRECATION_WARNING],
        meta: {
          aborted: false,
          request: {
            id: null,
            options: { meta: true },
            params: {
              method: 'GET',
              path: '/my-index/_count',
              querystring: 'q=a%20b',
              headers: KIBANA_ORIGIN,
              body: undefined,
            },
          },
        },
      });
    });

    it('SHOULD resolve with null warnings WHEN there is no warning header', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse({ count: 3 }));

      const { warnings } = await client.count({}, { meta: true });

      expect(warnings).toBeNull();
    });

    it('SHOULD resolve bulk calls with the result', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse({ errors: false, items: [], took: 1 }));

      const result = await client.bulk({ operations: [{ delete: { _id: '1' } }] }, { meta: true });

      expect(result).toMatchObject({ statusCode: 200, body: { errors: false } });
    });
  });

  describe('WHEN the asStream option is set', () => {
    it('SHOULD resolve with the unread response body', async () => {
      const { client, fetch } = await setup();
      const response = new Response('data: {}\n\n');
      fetch.mockResolvedValue({ response });

      const stream = await client.transport.request(
        { method: 'POST', path: '/_inference/completion/my-endpoint/_stream' },
        { asStream: true }
      );

      expect(stream).toBe(response.body);
      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_inference/completion/my-endpoint/_stream',
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
    });

    it('SHOULD resolve with the stream in the result WHEN meta is also set', async () => {
      const { client, fetch } = await setup();
      const response = new Response('data: {}\n\n', { status: 200 });
      fetch.mockResolvedValue({ response });

      const result = await client.transport.request(
        { method: 'POST', path: '/_inference/completion/my-endpoint/_stream' },
        { asStream: true, meta: true }
      );

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe(response.body);
    });

    it('SHOULD resolve with the read error body WHEN the status is ignored', async () => {
      const { client, fetch } = await setup();
      const error = fetchError(400, { error: { type: 'parse_exception' }, status: 400 });
      fetch.mockRejectedValue(Object.assign(error, { body: null }));

      const response = await client.transport.request(
        { method: 'POST', path: '/_inference/completion/my-endpoint/_stream' },
        { asStream: true, ignore: [400] }
      );

      expect(response).toEqual({ error: { type: 'parse_exception' }, status: 400 });
    });

    it('SHOULD resolve with the text of an ignored, unparsable error body', async () => {
      const { client, fetch } = await setup();
      const response = new Response('Bad Gateway', { status: 502 });
      fetch.mockRejectedValue(
        Object.assign(new Error('Bad Gateway'), {
          name: 'HttpFetchError',
          request: {},
          response,
          body: null,
        })
      );

      const body = await client.transport.request(
        { method: 'GET', path: '/_stream' },
        { asStream: true, ignore: [502] }
      );

      expect(body).toBe('Bad Gateway');
    });
  });

  describe('WHEN calling an exists API', () => {
    it('SHOULD resolve true for an existing resource', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse(''));

      expect(await client.indices.exists({ index: 'my-index' })).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/my-index',
        // Elasticsearch sends a JSON content type without a body, which must not be parsed.
        expect.objectContaining({ method: 'HEAD', rawResponse: true })
      );
    });

    it('SHOULD resolve false WHEN Elasticsearch answers 404', async () => {
      const { client, fetch } = await setup();
      fetch.mockRejectedValue(fetchError(404));

      expect(await client.indices.exists({ index: 'missing' })).toBe(false);
    });

    it('SHOULD resolve with a true body WHEN meta is set', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse(''));

      const result = await client.indices.exists({ index: 'my-index' }, { meta: true });

      expect(result).toMatchObject({ body: true, statusCode: 200 });
    });

    it('SHOULD resolve with a false body and the status WHEN meta is set', async () => {
      const { client, fetch } = await setup();
      fetch.mockRejectedValue(fetchError(404));

      const result = await client.indices.exists({ index: 'missing' }, { meta: true });

      expect(result).toMatchObject({ body: false, statusCode: 404 });
    });
  });

  describe('WHEN Elasticsearch answers with an error', () => {
    it('SHOULD reject with the fetch error', async () => {
      const { client, fetch } = await setup();
      const error = fetchError(403, { error: { type: 'security_exception' } });
      fetch.mockRejectedValue(error);

      await expect(client.search({ index: 'secret' })).rejects.toBe(error);
    });

    it('SHOULD resolve with the error body WHEN the status is ignored', async () => {
      const { client, fetch } = await setup();
      fetch.mockRejectedValue(fetchError(404, { found: false }));

      const response = await client.get({ index: 'my-index', id: '1' }, { ignore: [404] });

      expect(response).toEqual({ found: false });
    });

    it('SHOULD reject with the fetch error WHEN the request is aborted', async () => {
      const { client, fetch } = await setup();
      const error = Object.assign(new Error('The user aborted a request.'), {
        name: 'AbortError',
        request: {},
      });
      fetch.mockRejectedValue(error);

      await expect(client.search({ index: 'my-index' })).rejects.toBe(error);
    });
  });
});
