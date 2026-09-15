/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { Readable } from 'stream';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getProxyRouteHandlerDeps, getRequestHandlerContext } from './mocks';
import { createTransportResponseStub } from './stubs';
import { createHandler } from './create_handler';
import { routeValidationConfig } from './validation_config';

const drainStream = (stream: Readable) =>
  new Promise<void>((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
    stream.resume();
  });

const respondJson = (res: ServerResponse, statusCode: number, body: string) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    'x-elastic-product': 'Elasticsearch',
  });
  res.end(body);
};

// Spins up a local HTTP server backed by a real Elasticsearch transport client (HttpConnection),
// so tests can assert the production client's wire behavior. `nodePath` mirrors a path prefix
// configured on elasticsearch.hosts (e.g. `/es`).
const startMockEsServer = async (
  onRequest: (req: IncomingMessage, res: ServerResponse) => void,
  { nodePath = '' }: { nodePath?: string } = {}
) => {
  const server = createServer(onRequest);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const client = new Client({
    node: `http://127.0.0.1:${port}${nodePath}`,
    Connection: HttpConnection,
    maxRetries: 0,
  });
  const close = async () => {
    await client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { client, close };
};

describe('Console Proxy Route - Crete Handler', () => {
  const getCustomClientRoute = (deps: Parameters<typeof getProxyRouteHandlerDeps>[0] = {}) => {
    const setup = coreMock.createSetup();
    const start = coreMock.createStart();
    const customClient = elasticsearchServiceMock.createCustomClusterClient();
    const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
    customClient.asScoped.mockReturnValue(scopedClient);
    start.elasticsearch.createClient.mockReturnValue(customClient);
    setup.getStartServices.mockResolvedValue([start, {}, {}]);
    const handler = createHandler(
      getProxyRouteHandlerDeps({ ...deps, getStartServices: setup.getStartServices })
    );
    const { core } = getRequestHandlerContext('');

    return {
      core,
      customClient,
      handler,
      start,
      transportRequest: scopedClient.asCurrentUser.transport.request,
    };
  };

  describe('query logging', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('uses the Console query logger context for Elasticsearch requests', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core, transportRequest } = getRequestHandlerContext('');

      await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/_alias/console_logging_probe' },
        } as any,
        kibanaResponseFactory
      );

      expect(transportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/_alias/console_logging_probe?pretty=true',
        }),
        expect.objectContaining({
          asStream: true,
          meta: true,
          context: {
            loggingOptions: {
              loggerName: 'console',
            },
          },
        })
      );
    });

    it('keeps Elasticsearch error status in Console proxy headers', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core, transportRequest } = getRequestHandlerContext('');
      transportRequest.mockResolvedValue(
        createTransportResponseStub('{"status":404}', {
          statusCode: 404,
        })
      );

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/_alias/missing_alias' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.options.headers).toEqual(
        expect.objectContaining({
          'x-console-proxy-status-code': '404',
          'x-console-proxy-status-text': 'Not Found',
        })
      );
    });

    it('passes request bodies through to Elasticsearch transport requests', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core, transportRequest } = getRequestHandlerContext('');
      const body = Readable.from(['{"query":{"match_all":{}}}']);

      await handler(
        { core } as any,
        {
          body,
          headers: {},
          query: { method: 'POST', path: '/_search' },
        } as any,
        kibanaResponseFactory
      );

      expect(transportRequest.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          method: 'POST',
          path: '/_search?pretty=true',
          body,
        })
      );
    });

    it('receives streamed Elasticsearch error responses from the real transport client', async () => {
      const { client, close } = await startMockEsServer((req, res) => {
        respondJson(res, 404, '{"status":404}');
      });

      try {
        const esResponse = await client.transport.request<Readable>(
          { method: 'GET', path: '/missing_alias' },
          { asStream: true, meta: true }
        );

        expect(esResponse.statusCode).toBe(404);
        await drainStream(esResponse.body);
      } finally {
        await close();
      }
    });

    it('passes the transfer-encoding header so GET/DELETE bodies are chunked', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core, transportRequest } = getRequestHandlerContext('');
      const body = Readable.from(['{"query":{"match_all":{}}}']);

      await handler(
        { core } as any,
        {
          body,
          headers: {},
          query: { method: 'GET', path: '/_search' },
        } as any,
        kibanaResponseFactory
      );

      expect(transportRequest.mock.calls[0][1]?.headers).toEqual(
        expect.objectContaining({ 'transfer-encoding': 'chunked' })
      );
    });

    it('forwards request bodies unchanged for POST, GET and DELETE with the real transport client', async () => {
      // GET/DELETE with a request body is the behavior the removed raw proxy existed for: ES accepts
      // bodies on these methods, but Node's http client does not chunk-frame them by default, so the
      // body must be sent with transfer-encoding: chunked (as the handler does). Verify the production
      // transport client (HttpConnection) forwards the body unchanged for each method.
      const requestBody = '{"query":{"match_all":{}}}';
      const received: Record<string, string> = {};
      const { client, close } = await startMockEsServer((req, res) => {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          received[req.method as string] = body;
          respondJson(res, 200, '{"acknowledged":true}');
        });
      });

      try {
        for (const method of ['POST', 'GET', 'DELETE'] as const) {
          const esResponse = await client.transport.request<Readable>(
            { method, path: '/_search', body: Readable.from([requestBody]) },
            { asStream: true, meta: true, headers: { 'transfer-encoding': 'chunked' } }
          );

          expect(esResponse.statusCode).toBe(200);
          await drainStream(esResponse.body);
        }

        expect(received).toEqual({ POST: requestBody, GET: requestBody, DELETE: requestBody });
      } finally {
        await close();
      }
    });
  });

  describe('host validation', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('rejects requests to hosts not in the configured allowlist', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core } = getRequestHandlerContext('');
      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://attacker.com:8080' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(400);
    });

    it('accepts an allowlisted host even if the stored value differs only by trailing slash', async () => {
      const { core, handler, transportRequest } = getCustomClientRoute();
      transportRequest.mockResolvedValue(createTransportResponseStub(''));
      // The configured host is http://localhost:9200 (no trailing slash).
      // After URL normalisation it becomes http://localhost:9200/.
      // A client that stored the old (pre-normalisation) value should still match.
      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(200);
    });

    it('uses the original configured host (with credentials) for the upstream request', async () => {
      const { core, handler, start, transportRequest } = getCustomClientRoute({
        proxy: {
          readLegacyESConfig: async () => ({
            requestTimeout: duration(30000),
            customHeaders: {},
            requestHeadersWhitelist: [],
            hosts: ['http://kibana_system:SECRET@localhost:9200'],
          }),
        },
      });
      transportRequest.mockResolvedValue(createTransportResponseStub(''));

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200/' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(200);
      expect(start.elasticsearch.createClient).toHaveBeenCalledWith(
        'console',
        expect.objectContaining({
          hosts: ['http://kibana_system:SECRET@localhost:9200'],
        })
      );
    });

    it('disables sniffing for the selected custom host client', async () => {
      const { core, handler, start, transportRequest } = getCustomClientRoute();
      transportRequest.mockResolvedValue(createTransportResponseStub(''));

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(start.elasticsearch.createClient).toHaveBeenCalledWith(
        'console',
        expect.objectContaining({
          hosts: ['http://localhost:9200'],
          sniffOnStart: false,
          sniffOnConnectionFault: false,
          sniffInterval: false,
        })
      );
    });

    it('closes a custom Elasticsearch client after the streamed response is consumed', async () => {
      const { core, customClient, handler, transportRequest } = getCustomClientRoute();
      transportRequest.mockResolvedValue(createTransportResponseStub('response body'));

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );

      expect(customClient.close).not.toHaveBeenCalled();

      await drainStream(response.options.body as Readable);

      expect(customClient.close).toHaveBeenCalledTimes(1);
    });

    it('drains HEAD responses before closing a custom Elasticsearch client', async () => {
      const { core, customClient, handler, transportRequest } = getCustomClientRoute();
      transportRequest.mockResolvedValue(createTransportResponseStub(''));

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'HEAD', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.options.body).toBe('200 - OK');
      await new Promise((resolve) => setImmediate(resolve));
      expect(customClient.close).toHaveBeenCalledTimes(1);
    });

    it('drains HEAD responses for the default Elasticsearch client', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const { core, transportRequest } = getRequestHandlerContext('');
      const transportResponse = createTransportResponseStub('');
      const resumeSpy = jest.spyOn(transportResponse.body, 'resume');
      transportRequest.mockResolvedValue(transportResponse);

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'HEAD', path: '/' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.options.body).toBe('200 - OK');
      expect(resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('closes a custom Elasticsearch client when the request fails before a response stream exists', async () => {
      const { core, customClient, handler, transportRequest } = getCustomClientRoute();
      transportRequest.mockRejectedValue(new Error('connection failed'));

      const response = await handler(
        { core } as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );

      expect(response.status).toBe(502);
      expect(customClient.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('elasticsearch.hosts path prefix (issue #179436)', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('keeps a path prefix configured on elasticsearch.hosts for proxied requests', async () => {
      // Regression guard for https://github.com/elastic/kibana/issues/179436: when
      // elasticsearch.hosts includes a path prefix (e.g. http://host:9200/es, used when ES is
      // behind a reverse proxy), Console proxy requests must preserve that prefix. The handler
      // builds the request path without the prefix and relies on the Core Elasticsearch client
      // (HttpConnection) to prepend the configured node's path. This drives the full chain with a
      // real transport client against a local mock Elasticsearch and asserts the wire path.
      const receivedPaths: string[] = [];
      // Mirror Core's Elasticsearch client: HttpConnection plus a node URL carrying a path prefix.
      const { client, close } = await startMockEsServer(
        (req, res) => {
          receivedPaths.push(req.url ?? '');
          respondJson(res, 200, '{"acknowledged":true}');
        },
        { nodePath: '/es' }
      );
      const core = Promise.resolve({
        elasticsearch: { client: { asCurrentUser: client } },
      });
      const handler = createHandler(getProxyRouteHandlerDeps({}));

      try {
        const response = await handler(
          { core } as any,
          {
            headers: {},
            query: { method: 'GET', path: '/_cluster/health' },
          } as any,
          kibanaResponseFactory
        );

        expect(response.status).toBe(200);
        await drainStream(response.options.body as Readable);

        expect(receivedPaths).toContain('/es/_cluster/health?pretty=true');
        expect(receivedPaths.every((path) => path.startsWith('/es/'))).toBe(true);
      } finally {
        await close();
      }
    });
  });

  describe('route validation config', () => {
    it('should accept host parameter in query schema', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
        host: 'http://custom-host:9200',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept query without host parameter', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept host parameter alongside other query parameters', () => {
      const validQuery = {
        method: 'POST',
        path: '/test-index/_doc',
        host: 'http://custom-host:9200',
        withProductOrigin: true,
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should validate the host parameter as optional string', () => {
      const queryWithEmptyHost = {
        method: 'GET',
        path: '/_cat/indices',
        host: '',
      };

      // Empty string should be valid (it's a string)
      expect(() => routeValidationConfig.query.validate(queryWithEmptyHost)).not.toThrow();
    });
  });
});
