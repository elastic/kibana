/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import { errors } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { CoreKibanaRequest, ensureRawRequest } from '@kbn/core-http-router-server-internal';
import type { RequestFixtureOptions } from '@kbn/core-http-router-server-mocks';
import { createProxyHandler, getEsPath } from './proxy_handler';
import type { ProxyBody, ProxyParams } from './proxy_handler';

const setup = (requestOptions: RequestFixtureOptions<ProxyParams, unknown, ProxyBody> = {}) => {
  const log = coreMock.createPluginInitializerContext().logger.get();
  const { http } = coreMock.createSetup();
  const handler = createProxyHandler({
    router: http.createRouter(),
    log,
    basePath: http.basePath,
  });
  const core = coreMock.createRequestHandlerContext();
  const transportRequest = core.elasticsearch.client.asCurrentUser.transport.request;
  const esBody = Readable.from(['{"acknowledged":true}']);
  transportRequest.mockResolvedValue({
    statusCode: 200,
    headers: { 'content-type': 'application/json', warning: '299 deprecated', 'x-other': 'nope' },
    body: esBody,
  });
  const request = httpServerMock.createKibanaRequest<ProxyParams, unknown, ProxyBody>({
    path: '/internal/es_client/my-index/_search',
    headers: { 'content-type': 'application/json', cookie: 'sid=secret', host: 'kibana:5601' },
    ...requestOptions,
  });

  const run = (handledRequest = request) =>
    handler(
      coreMock.createCustomRequestHandlerContext({ core }),
      handledRequest,
      kibanaResponseFactory
    );

  return { run, transportRequest, esBody, log, request };
};

describe('WHEN proxying a request to Elasticsearch', () => {
  it('SHOULD forward method, path and raw query string', async () => {
    const { run, transportRequest } = setup({ method: 'post', query: { q: 'a:b', pretty: '' } });

    await run();

    expect(transportRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/my-index/_search',
        querystring: 'q=a%3Ab&pretty=',
      }),
      expect.anything()
    );
  });

  it('SHOULD request a streamed response with a timeout and an abort signal', async () => {
    const { run, transportRequest } = setup();

    await run();

    const [, options] = transportRequest.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({
        asStream: { retryOn401: true },
        meta: true,
        requestTimeout: 120_000,
        signal: expect.any(AbortSignal),
      })
    );
  });

  describe('WHEN the method is get', () => {
    it('SHOULD use the client retry settings', async () => {
      const { run, transportRequest } = setup({ method: 'get' });

      await run();

      const [, options] = transportRequest.mock.calls[0];
      expect(options).not.toHaveProperty('maxRetries');
    });
  });

  describe.each(['post', 'put', 'delete'] as const)('WHEN the method is %s', (method) => {
    it('SHOULD disable retries', async () => {
      const { run, transportRequest } = setup({ method });

      await run();

      const [, options] = transportRequest.mock.calls[0];
      expect(options?.maxRetries).toBe(0);
    });

    it('SHOULD retry once after refreshing credentials WHEN Elasticsearch answers 401', async () => {
      const { run, transportRequest } = setup({ method });

      await run();

      const [, options] = transportRequest.mock.calls[0];
      expect(options?.asStream).toEqual({ retryOn401: true });
    });
  });

  it('SHOULD forward the request body as a buffer', async () => {
    const body = Buffer.from('{"query":{"match_all":{}}}');
    const { run, transportRequest } = setup({
      method: 'delete',
      body,
      validation: { body: schema.maybe(schema.buffer()) },
    });

    await run();

    const [params, options] = transportRequest.mock.calls[0];
    expect(params.body).toEqual(body);
    expect(options?.headers).not.toHaveProperty('transfer-encoding');
  });

  it('SHOULD send no body WHEN the request body is empty', async () => {
    const { run, transportRequest } = setup({
      method: 'post',
      body: Buffer.alloc(0),
      validation: { body: schema.maybe(schema.buffer()) },
    });

    await run();

    const [params] = transportRequest.mock.calls[0];
    expect(params.body).toBeUndefined();
  });

  it('SHOULD forward the content encoding of a compressed body without compressing it again', async () => {
    const body = Buffer.from([0x1f, 0x8b]);
    const { run, transportRequest } = setup({
      method: 'post',
      body,
      headers: { 'content-type': 'application/x-ndjson', 'content-encoding': 'gzip' },
      validation: { body: schema.maybe(schema.buffer()) },
    });

    await run();

    const [, options] = transportRequest.mock.calls[0];
    expect(options?.headers?.['content-encoding']).toBe('gzip');
    expect(options?.compression).toBe(false);
  });

  it('SHOULD leave transport compression alone WHEN the body is not encoded', async () => {
    const body = Buffer.from('{}');
    const { run, transportRequest } = setup({
      method: 'post',
      body,
      validation: { body: schema.maybe(schema.buffer()) },
    });

    await run();

    const [, options] = transportRequest.mock.calls[0];
    expect(options?.headers).not.toHaveProperty('content-encoding');
    expect(options).not.toHaveProperty('compression');
  });

  it('SHOULD only send allowlisted headers to Elasticsearch', async () => {
    const { run, transportRequest } = setup();

    await run();

    const headers = transportRequest.mock.calls[0][1]?.headers ?? {};
    expect(headers).not.toHaveProperty('cookie');
    expect(headers).not.toHaveProperty('host');
    expect(headers).not.toHaveProperty('transfer-encoding');
    expect(headers['content-type']).toBe('application/json');
  });

  describe('WHEN the client sends a product origin', () => {
    it('SHOULD pass it through to Elasticsearch', async () => {
      const { run, transportRequest } = setup({
        headers: { 'x-elastic-product-origin': 'kibana' },
      });

      await run();

      const [, options] = transportRequest.mock.calls[0];
      expect(options?.headers?.['x-elastic-product-origin']).toBe('kibana');
    });
  });

  describe('WHEN the client sends no product origin', () => {
    it("SHOULD clear the scoped client's Kibana origin", async () => {
      const { run, transportRequest } = setup();

      await run();

      const [, options] = transportRequest.mock.calls[0];
      expect(options?.headers?.['x-elastic-product-origin']).toBe('');
    });
  });

  it('SHOULD stream the Elasticsearch response back with its status and selected headers', async () => {
    const { run, esBody } = setup();

    const response = await run();

    expect(response.status).toBe(200);
    expect(response.payload).toBe(esBody);
    expect(response.options.headers).toEqual({
      'content-type': 'application/json',
      warning: '299 deprecated',
    });
  });

  it('SHOULD forward async query and body length headers', async () => {
    const { run, transportRequest } = setup({ method: 'post' });
    transportRequest.mockResolvedValue({
      statusCode: 200,
      headers: {
        'content-type': 'text/csv',
        'content-length': '42',
        'x-elasticsearch-async-id': 'FmNJRUZ1YWZCU3dHY1BIOUhaenVSRkEaaXF',
        'x-elasticsearch-async-is-running': '?1',
      },
      body: Readable.from(['a,b\n1,2\n']),
    });

    const response = await run();

    expect(response.options.headers).toEqual({
      'content-type': 'text/csv',
      'content-length': '42',
      'x-elasticsearch-async-id': 'FmNJRUZ1YWZCU3dHY1BIOUhaenVSRkEaaXF',
      'x-elasticsearch-async-is-running': '?1',
    });
  });

  it('SHOULD drop body length and encoding WHEN the transport rebuilt the error body', async () => {
    const { run, transportRequest } = setup();
    transportRequest.mockRejectedValue(
      new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 401,
          body: { error: { type: 'security_exception' } },
          headers: {
            'content-type': 'application/json',
            'content-length': '512',
            'content-encoding': 'gzip',
          },
        })
      )
    );

    const response = await run();

    expect(response.status).toBe(401);
    expect(response.options.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('SHOULD disable compression WHEN Elasticsearch returns server-sent events', async () => {
    const { run, transportRequest } = setup({ method: 'post' });
    transportRequest.mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: Readable.from(['data: {}\n\n']),
    });

    const response = await run();

    expect(response.options.headers).toEqual({
      'content-type': 'text/event-stream; charset=utf-8',
      'content-encoding': 'identity',
    });
  });

  it('SHOULD leave compression enabled for other content types', async () => {
    const { run } = setup();

    const response = await run();

    expect(response.options.headers).not.toHaveProperty('content-encoding');
  });

  it('SHOULD forward retry-after WHEN Elasticsearch rejects a request with 429', async () => {
    const { run, transportRequest } = setup({ method: 'post' });
    transportRequest.mockResolvedValue({
      statusCode: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '30' },
      body: Readable.from(['{"error":"es_rejected_execution_exception"}']),
    });

    const response = await run();

    expect(response.status).toBe(429);
    expect(response.options.headers).toHaveProperty('retry-after', '30');
  });

  it('SHOULD rewrite location to point back through the proxy', async () => {
    const { run, transportRequest } = setup({ method: 'put' });
    transportRequest.mockResolvedValue({
      statusCode: 201,
      headers: { 'content-type': 'application/json', location: '/my-index/_doc/1' },
      body: Readable.from(['{"result":"created"}']),
    });

    const response = await run();

    expect(response.options.headers).toHaveProperty(
      'location',
      '/mock-server-basepath/internal/es_client/my-index/_doc/1'
    );
  });

  it('SHOULD pass Elasticsearch error statuses through unchanged', async () => {
    const { run, transportRequest } = setup();
    const errorBody = Readable.from(['{"error":"index_not_found_exception"}']);
    transportRequest.mockResolvedValue({ statusCode: 404, headers: {}, body: errorBody });

    const response = await run();

    expect(response.status).toBe(404);
    expect(response.payload).toBe(errorBody);
  });

  it('SHOULD return 504 WHEN Elasticsearch times out', async () => {
    const { run, transportRequest, log } = setup();
    transportRequest.mockRejectedValue(new errors.TimeoutError('Request timed out'));

    const response = await run();

    expect(response.status).toBe(504);
    expect(log.warn).toHaveBeenCalled();
  });

  it('SHOULD return 502 WHEN Elasticsearch is unreachable', async () => {
    const { run, transportRequest } = setup();
    transportRequest.mockRejectedValue(new errors.ConnectionError('ECONNREFUSED'));

    const response = await run();

    expect(response.status).toBe(502);
  });

  it('SHOULD return 499 WHEN the request is aborted', async () => {
    const { run, transportRequest } = setup();
    transportRequest.mockRejectedValue(new errors.RequestAbortedError('aborted'));

    const response = await run();

    expect(response.status).toBe(499);
  });

  it('SHOULD rethrow unexpected errors', async () => {
    const { run, transportRequest } = setup();
    const error = new Error('unexpected');
    transportRequest.mockRejectedValue(error);

    await expect(run()).rejects.toBe(error);
  });

  it('SHOULD default to 500 and no headers WHEN an error response has neither', async () => {
    const { run, transportRequest } = setup();
    const error = new errors.ResponseError(
      elasticsearchClientMock.createApiResponse({ body: 'failed' })
    );
    Object.assign(error.meta, { statusCode: undefined, headers: undefined });
    transportRequest.mockRejectedValue(error);

    const response = await run();

    expect(response.status).toBe(500);
    expect(response.options.headers).toEqual({});
  });

  it('SHOULD default to 200 and no headers WHEN the response has neither', async () => {
    const { run, transportRequest } = setup();
    transportRequest.mockResolvedValue({ body: Readable.from(['{}']) });

    const response = await run();

    expect(response.status).toBe(200);
    expect(response.options.headers).toEqual({});
  });

  it('SHOULD forward the first accept header value', async () => {
    const { run, transportRequest } = setup({ headers: { accept: 'text/csv' } });

    await run();

    expect(transportRequest.mock.calls[0][1]?.headers?.accept).toBe('text/csv');
  });

  it('SHOULD use the first value of a repeated request header', async () => {
    const { run, transportRequest, request } = setup();
    const rawRequest = ensureRawRequest(request);
    Object.assign(rawRequest.headers, { 'content-type': ['text/plain', 'application/json'] });

    await run(CoreKibanaRequest.from<ProxyParams, unknown, ProxyBody>(rawRequest));

    expect(transportRequest.mock.calls[0][1]?.headers?.['content-type']).toBe('text/plain');
  });

  it('SHOULD default the content type to JSON', async () => {
    const { run, transportRequest } = setup({ headers: {} });

    await run();

    expect(transportRequest.mock.calls[0][1]?.headers?.['content-type']).toBe('application/json');
  });

  it('SHOULD send x-forwarded headers WHEN the client address is known', async () => {
    const { run, transportRequest, request } = setup();
    Object.assign(ensureRawRequest(request), {
      info: { remoteAddress: '10.0.0.1', remotePort: 51234, host: 'kibana:5601' },
      server: { info: { protocol: 'https' } },
    });

    await run();

    expect(transportRequest.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({
        'x-forwarded-for': '10.0.0.1',
        'x-forwarded-port': '51234',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'kibana:5601',
      })
    );
  });
});

describe('WHEN building the Elasticsearch path', () => {
  it('SHOULD keep percent-encoded characters', () => {
    expect(getEsPath(new URL('http://kibana/internal/es_client/my-index/_doc/a%2Fb'))).toBe(
      '/my-index/_doc/a%2Fb'
    );
  });

  it.each(['http://kibana/internal/es_client', 'http://kibana/internal/es_client/'])(
    'SHOULD map the proxy root %s to the Elasticsearch root',
    (url) => {
      expect(getEsPath(new URL(url))).toBe('/');
    }
  );
});
