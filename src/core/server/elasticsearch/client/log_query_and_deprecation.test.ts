/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Buffer } from 'buffer';
import { Readable } from 'stream';

import {
  errors,
  type Client,
  type ConnectionRequestParams,
  type TransportRequestOptions,
  type TransportRequestParams,
  type DiagnosticResult,
  type RequestBody,
} from '@elastic/elasticsearch';

import { parseClientOptionsMock, ClientMock } from './configure_client.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';

const createApiResponse = <T>({
  body,
  statusCode = 200,
  headers = {},
  warnings = null,
  params = { method: 'GET', path: '/path', querystring: '?wait_for_completion=true' },
  requestOptions = {},
}: {
  body: T;
  statusCode?: number;
  headers?: Record<string, string>;
  warnings?: string[] | null;
  params?: TransportRequestParams | ConnectionRequestParams;
  requestOptions?: TransportRequestOptions;
}): DiagnosticResult<T> => {
  return {
    body,
    statusCode,
    headers,
    warnings,
    meta: {
      body,
      request: {
        params: params!,
        options: requestOptions,
      } as any,
    } as any,
  };
};

const createFakeClient = () => {
  const actualEs = jest.requireActual('@elastic/elasticsearch');
  const client = new actualEs.Client({
    nodes: ['http://localhost'], // Enforcing `nodes` because it's mandatory
  });
  jest.spyOn(client.diagnostic, 'on');
  return client as Client;
};

describe('instrumentQueryAndDeprecationLogger', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const client = createFakeClient();

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    parseClientOptionsMock.mockReturnValue({});
    ClientMock.mockImplementation(() => createFakeClient());
  });

  afterEach(() => {
    parseClientOptionsMock.mockReset();
    ClientMock.mockReset();
    jest.clearAllMocks();
  });

  function createResponseWithBody(
    body?: RequestBody,
    params?: { headers?: Record<string, string> }
  ) {
    return createApiResponse({
      body: {},
      statusCode: 200,
      headers: params?.headers ?? {},
      params: {
        method: 'GET',
        path: '/foo',
        querystring: { hello: 'dolly' },
        body,
      },
    });
  }

  it('creates a query logger context based on the `type` parameter', () => {
    instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test123' });
    expect(logger.get).toHaveBeenCalledWith('query', 'test123');
  });

  describe('logs each query', () => {
    it('when request body is an object', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody({
        seq_no_primary_term: true,
        query: {
          term: { user: 'kimchy' },
        },
      });

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?hello=dolly
        {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}"
      `);
    });

    it('when request body is a string', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody(
        JSON.stringify({
          seq_no_primary_term: true,
          query: {
            term: { user: 'kimchy' },
          },
        })
      );

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?hello=dolly
        {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}"
      `);
    });

    it('when request body is a buffer', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody(
        Buffer.from(
          JSON.stringify({
            seq_no_primary_term: true,
            query: {
              term: { user: 'kimchy' },
            },
          })
        )
      );

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?hello=dolly
        [buffer]"
      `);
    });

    it('when request body is a readable stream', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody(
        Readable.from(
          JSON.stringify({
            seq_no_primary_term: true,
            query: {
              term: { user: 'kimchy' },
            },
          })
        )
      );

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?hello=dolly
        [stream]"
      `);
    });

    it('when request body is not defined', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody();

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?hello=dolly"
      `);
    });

    it('properly encode queries', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        body: {},
        statusCode: 200,
        params: {
          method: 'GET',
          path: '/foo',
          querystring: { city: 'Münich' },
        },
      });

      client.diagnostic.emit('response', null, response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200
        GET /foo?city=M%C3%BCnich"
      `);
    });

    it('logs queries even in case of errors', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 500,
        body: {
          error: {
            type: 'internal server error',
          },
        },
        params: {
          method: 'GET',
          path: '/foo',
          querystring: { hello: 'dolly' },
          body: {
            seq_no_primary_term: true,
            query: {
              term: { user: 'kimchy' },
            },
          },
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "500
        GET /foo?hello=dolly
        {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}} [internal server error]: internal server error"
      `);
    });

    it('logs debug when the client emits an @elastic/elasticsearch error', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({ body: {} });
      client.diagnostic.emit('response', new errors.TimeoutError('message', response), response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(
        `"[TimeoutError]: message"`
      );
    });

    it('logs debug when the client emits an ResponseError returned by elasticsearch', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 400,
        headers: {},
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
        },
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'request [/_path] contains unrecognized parameter: [name]',
          },
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "400
        GET /_path?hello=dolly [illegal_argument_exception]: request [/_path] contains unrecognized parameter: [name]"
      `);
    });

    it('logs default error info when the error response body is empty', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      let response: DiagnosticResult<any, any> = createApiResponse({
        statusCode: 400,
        headers: {},
        params: {
          method: 'GET',
          path: '/_path',
        },
        body: {
          error: {},
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "400
        GET /_path [undefined]: {\\"error\\":{}}"
      `);

      logger.debug.mockClear();

      response = createApiResponse({
        statusCode: 400,
        headers: {},
        params: {
          method: 'GET',
          path: '/_path',
        },
        body: undefined,
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "400
        GET /_path [undefined]: Response Error"
      `);
    });

    it('adds meta information to logs', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      let response = createApiResponse({
        statusCode: 400,
        headers: {},
        params: {
          method: 'GET',
          path: '/_path',
        },
        requestOptions: {
          opaqueId: 'opaque-id',
        },
        body: {
          error: {},
        },
      });
      client.diagnostic.emit('response', null, response);

      expect(loggingSystemMock.collect(logger).debug[0][1]).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "request": Object {
              "headers": Object {},
              "id": "opaque-id",
              "method": "GET",
            },
            "response": Object {
              "body": Object {
                "bytes": undefined,
              },
              "headers": Object {},
              "status_code": 400,
            },
          },
          "url": Object {
            "path": "/_path",
            "query": undefined,
          },
        }
      `);

      logger.debug.mockClear();

      response = createApiResponse({
        statusCode: 400,
        headers: {},
        params: {
          method: 'GET',
          path: '/_path',
        },
        requestOptions: {
          opaqueId: 'opaque-id',
        },
        body: {} as any,
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).debug[0][1]).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "request": Object {
              "headers": Object {},
              "id": "opaque-id",
              "method": "GET",
            },
            "response": Object {
              "body": Object {
                "bytes": undefined,
              },
              "headers": Object {},
              "status_code": 400,
            },
          },
          "url": Object {
            "path": "/_path",
            "query": undefined,
          },
        }
      `);
    });

    it('logs response size', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createResponseWithBody(
        {
          seq_no_primary_term: true,
          query: {
            term: { user: 'kimchy' },
          },
        },
        {
          headers: { 'content-length': '12345678' },
        }
      );

      client.diagnostic.emit('response', null, response);
      expect(loggingSystemMock.collect(logger).debug[0][0]).toMatchInlineSnapshot(`
        "200 - 11.8MB
        GET /foo?hello=dolly
        {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}"
      `);
    });
  });

  describe('deprecation warnings from response headers', () => {
    it('does not log when no deprecation warning header is returned', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 200,
        warnings: null,
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
        },
        body: {
          hits: [
            {
              _source: 'may the source be with you',
            },
          ],
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      // One debug log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug.length).toEqual(1);
      expect(loggingSystemMock.collect(logger).info).toEqual([]);
    });

    it('does not log when warning header comes from a warn-agent that is not elasticsearch', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 200,
        warnings: [
          '299 nginx/2.3.1 "GET /_path is deprecated"',
          '299 nginx/2.3.1 "GET hello query param is deprecated"',
        ],
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
        },
        body: {
          hits: [
            {
              _source: 'may the source be with you',
            },
          ],
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      // One debug log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug.length).toEqual(1);
      expect(loggingSystemMock.collect(logger).info).toEqual([]);
    });

    it('logs error when the client receives an Elasticsearch error response for a deprecated request originating from a user', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 400,
        warnings: ['299 Elasticsearch-8.1.0 "GET /_path is deprecated"'],
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
        },
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'request [/_path] contains unrecognized parameter: [name]',
          },
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).info).toEqual([]);
      // Test debug[1] since theree is one log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        'Elasticsearch deprecation: 299 Elasticsearch-8.1.0 "GET /_path is deprecated"'
      );
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch('Origin:user');
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(/Stack trace:\n.*at/);
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        /Query:\n.*400\n.*GET \/_path\?hello\=dolly \[illegal_argument_exception\]: request \[\/_path\] contains unrecognized parameter: \[name\]/
      );
    });

    it('logs warning when the client receives an Elasticsearch error response for a deprecated request originating from kibana', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 400,
        warnings: ['299 Elasticsearch-8.1.0 "GET /_path is deprecated"'],
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
          // Set the request header to indicate to Elasticsearch that this is a request over which users have no control
          headers: { 'x-elastic-product-origin': 'kibana' },
        },
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'request [/_path] contains unrecognized parameter: [name]',
          },
        },
      });
      client.diagnostic.emit('response', new errors.ResponseError(response), response);

      // Test debug[1] since theree is one log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        'Elasticsearch deprecation: 299 Elasticsearch-8.1.0 "GET /_path is deprecated"'
      );
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch('Origin:kibana');
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(/Stack trace:\n.*at/);
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        /Query:\n.*400\n.*GET \/_path\?hello\=dolly \[illegal_argument_exception\]: request \[\/_path\] contains unrecognized parameter: \[name\]/
      );
    });

    it('logs error when the client receives an Elasticsearch success response for a deprecated request originating from a user', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 200,
        warnings: ['299 Elasticsearch-8.1.0 "GET /_path is deprecated"'],
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
        },
        body: {
          hits: [
            {
              _source: 'may the source be with you',
            },
          ],
        },
      });
      client.diagnostic.emit('response', null, response);

      // Test debug[1] since theree is one log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        'Elasticsearch deprecation: 299 Elasticsearch-8.1.0 "GET /_path is deprecated"'
      );
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch('Origin:user');
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(/Stack trace:\n.*at/);
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        /Query:\n.*200\n.*GET \/_path\?hello\=dolly/
      );
    });

    it('logs warning when the client receives an Elasticsearch success response for a deprecated request originating from kibana', () => {
      instrumentEsQueryAndDeprecationLogger({ logger, client, type: 'test type' });

      const response = createApiResponse({
        statusCode: 200,
        warnings: ['299 Elasticsearch-8.1.0 "GET /_path is deprecated"'],
        params: {
          method: 'GET',
          path: '/_path',
          querystring: { hello: 'dolly' },
          // Set the request header to indicate to Elasticsearch that this is a request over which users have no control
          headers: { 'x-elastic-product-origin': 'kibana' },
        },
        body: {
          hits: [
            {
              _source: 'may the source be with you',
            },
          ],
        },
      });
      client.diagnostic.emit('response', null, response);

      // Test debug[1] since theree is one log entry from 'elasticsearch.query' context
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        'Elasticsearch deprecation: 299 Elasticsearch-8.1.0 "GET /_path is deprecated"'
      );
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch('Origin:kibana');
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(/Stack trace:\n.*at/);
      expect(loggingSystemMock.collect(logger).debug[1][0]).toMatch(
        /Query:\n.*200\n.*GET \/_path\?hello\=dolly/
      );
    });
  });
});
