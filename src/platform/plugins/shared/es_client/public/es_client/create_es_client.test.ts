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

const ELASTICSEARCH_WARNING = '299 Elasticsearch-9.0.0 "this request accesses system indices"';

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

  it('SHOULD keep reserved characters in path parameters encoded', async () => {
    const { client, fetch } = await setup();

    await client.get({ index: 'my-index', id: 'a/b c' });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_doc/a%2Fb%20c',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('SHOULD send list query parameters as comma-separated values', async () => {
    const { client, fetch } = await setup();

    await client.search({ index: 'my-index', _source_includes: ['a', 'b'] });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({ query: { _source_includes: 'a,b' } })
    );
  });

  it('SHOULD call namespaced APIs', async () => {
    const { client, fetch } = await setup();

    await client.indices.getMapping({ index: 'my-index' });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_mapping',
      expect.objectContaining({ method: 'GET' })
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

  describe('WHEN the meta option is set', () => {
    it('SHOULD resolve with the status, headers, warnings and request', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(
        okResponse({ count: 3 }, { warning: `${ELASTICSEARCH_WARNING}, 199 agent "other"` })
      );

      const result = await client.count({ index: 'my-index', q: 'a b' }, { meta: true });

      expect(result).toEqual({
        body: { count: 3 },
        statusCode: 200,
        headers: { warning: `${ELASTICSEARCH_WARNING}, 199 agent "other"` },
        warnings: [ELASTICSEARCH_WARNING],
        meta: {
          aborted: false,
          request: {
            id: null,
            options: { meta: true },
            params: {
              method: 'GET',
              path: '/my-index/_count',
              querystring: 'q=a%20b',
              headers: {},
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
  });

  describe('WHEN calling an exists API', () => {
    it('SHOULD resolve true for an existing resource', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse(''));

      expect(await client.indices.exists({ index: 'my-index' })).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/my-index',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('SHOULD resolve false WHEN Elasticsearch answers 404', async () => {
      const { client, fetch } = await setup();
      fetch.mockRejectedValue(fetchError(404));

      expect(await client.indices.exists({ index: 'missing' })).toBe(false);
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

  it('SHOULD send bulk operations as ndjson', async () => {
    const { client, fetch } = await setup();

    await client.bulk({
      index: 'my-index',
      refresh: true,
      operations: [{ index: { _id: '1' } }, { message: 'hello' }],
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_bulk',
      expect.objectContaining({
        method: 'POST',
        query: { refresh: true },
        body: '{"index":{"_id":"1"}}\n{"message":"hello"}\n',
        headers: { 'Content-Type': 'application/x-ndjson' },
      })
    );
  });

  it('SHOULD resolve bulk calls with the result WHEN meta is set', async () => {
    const { client, fetch } = await setup();
    fetch.mockResolvedValue(okResponse({ errors: false, items: [], took: 1 }));

    const result = await client.bulk({ operations: [{ delete: { _id: '1' } }] }, { meta: true });

    expect(result).toMatchObject({ statusCode: 200, body: { errors: false } });
  });

  it('SHOULD send multi-search bodies as ndjson', async () => {
    const { client, fetch } = await setup();

    await client.msearch({ searches: [{ index: 'my-index' }, { query: { match_all: {} } }] });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/_msearch',
      expect.objectContaining({
        body: '{"index":"my-index"}\n{"query":{"match_all":{}}}\n',
        headers: { 'Content-Type': 'application/x-ndjson' },
      })
    );
  });

  it('SHOULD pass abort signals and normalize the content type header', async () => {
    const { client, fetch } = await setup();
    const { signal } = new AbortController();

    await client.search(
      { index: 'my-index' },
      { signal, headers: { 'content-type': 'application/vnd.elasticsearch+json' } }
    );

    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/my-index/_search',
      expect.objectContaining({
        signal,
        headers: { 'Content-Type': 'application/vnd.elasticsearch+json' },
      })
    );
  });

  describe('WHEN sending bulk requests', () => {
    it('SHOULD send a string body as is to the root bulk API', async () => {
      const { client, fetch } = await setup();
      const body = '{"delete":{"_index":"my-index","_id":"1"}}\n';

      await client.bulk({ body });

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_bulk',
        expect.objectContaining({ body, query: {} })
      );
    });

    it('SHOULD reject WHEN there are no operations', async () => {
      const { client, fetch } = await setup();

      await expect(client.bulk({ index: 'my-index' })).rejects.toThrow(
        'Missing required parameter [operations]'
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('WHEN sending raw requests through transport.request', () => {
    it('SHOULD merge string and object query strings, skipping undefined values', async () => {
      const { client, fetch } = await setup();

      await client.transport.request(
        { method: 'GET', path: '/_cat/indices', querystring: 'format=json&h=index' },
        { querystring: { bytes: 'b', s: undefined } }
      );

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_cat/indices',
        expect.objectContaining({ query: { format: 'json', h: 'index', bytes: 'b' } })
      );
    });

    it('SHOULD join list headers and skip undefined headers', async () => {
      const { client, fetch } = await setup();

      await client.transport.request(
        { method: 'GET', path: '/' },
        { headers: { 'x-list': ['a', 'b'], 'x-skipped': undefined } }
      );

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/',
        expect.objectContaining({ headers: { 'x-list': 'a, b' } })
      );
    });

    it('SHOULD keep an explicit content type for bulk bodies', async () => {
      const { client, fetch } = await setup();

      await client.transport.request(
        { method: 'POST', path: '/_bulk', bulkBody: [{ delete: { _id: '1' } }] },
        { headers: { 'Content-Type': 'application/vnd.elasticsearch+x-ndjson' } }
      );

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_bulk',
        expect.objectContaining({
          body: '{"delete":{"_id":"1"}}\n',
          headers: { 'Content-Type': 'application/vnd.elasticsearch+x-ndjson' },
        })
      );
    });

    it('SHOULD send string bulk lines as is', async () => {
      const { client, fetch } = await setup();

      await client.bulk<string>({
        operations: ['{"delete":{"_id":"1"}}', { delete: { _id: '2' } }],
      });

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_bulk',
        expect.objectContaining({ body: '{"delete":{"_id":"1"}}\n{"delete":{"_id":"2"}}\n' })
      );
    });

    it('SHOULD send a string body as is', async () => {
      const { client, fetch } = await setup();

      await client.transport.request({ method: 'POST', path: '/_sql', body: '{"query":"x"}' });

      expect(fetch).toHaveBeenCalledWith(
        '/internal/es_client/_sql',
        expect.objectContaining({ body: '{"query":"x"}' })
      );
    });

    it.each([
      ['a buffer body', { body: Buffer.from([1]) }],
      ['a stream body', { body: { pipe: () => undefined } }],
      ['a web stream body', { body: { getReader: () => undefined } }],
      ['a buffer bulk body', { bulkBody: Buffer.from([1]) }],
    ])('SHOULD reject %s', async (_name, bodyParams) => {
      const { client, fetch } = await setup();

      await expect(
        client.transport.request({ method: 'POST', path: '/_bulk', ...bodyParams })
      ).rejects.toThrow('only sends string and JSON bodies');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('SHOULD reject methods the proxy does not support', async () => {
      const { client, fetch } = await setup();

      await expect(client.transport.request({ method: 'PATCH', path: '/' })).rejects.toThrow(
        'does not support the PATCH method'
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it('SHOULD reject WHEN no response is received', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue({ body: {} });

      await expect(client.transport.request({ method: 'GET', path: '/' })).rejects.toThrow(
        'No response received for GET /'
      );
    });

    it('SHOULD resolve with the text of an ignored, unparsable streamed error body', async () => {
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

    it('SHOULD resolve a HEAD request with a true body WHEN meta is set', async () => {
      const { client, fetch } = await setup();
      fetch.mockResolvedValue(okResponse(''));

      const result = await client.indices.exists({ index: 'my-index' }, { meta: true });

      expect(result).toMatchObject({ body: true, statusCode: 200 });
    });
  });
});
