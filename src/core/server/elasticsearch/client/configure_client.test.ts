/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Buffer } from 'buffer';
import { Readable } from 'stream';

import { RequestEvent, errors } from '@elastic/elasticsearch';
import { TransportRequestParams, RequestBody } from '@elastic/elasticsearch/lib/Transport';

import { parseClientOptionsMock, ClientMock } from './configure_client.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { EventEmitter } from 'events';
import type { ElasticsearchClientConfig } from './client_config';
import { configureClient } from './configure_client';

const createFakeConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return ({
    type: 'fake-config',
    ...parts,
  } as unknown) as ElasticsearchClientConfig;
};

const createFakeClient = () => {
  const client = new EventEmitter();
  jest.spyOn(client, 'on');
  return client;
};

const createApiResponse = <T>({
  body,
  statusCode = 200,
  headers = {},
  warnings = [],
  params,
}: {
  body: T;
  statusCode?: number;
  headers?: Record<string, string>;
  warnings?: string[];
  params?: TransportRequestParams;
}): RequestEvent<T> => {
  return {
    body,
    statusCode,
    headers,
    warnings,
    meta: {
      request: {
        params: params!,
      } as any,
    } as any,
  };
};

describe('configureClient', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let config: ElasticsearchClientConfig;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    config = createFakeConfig();
    parseClientOptionsMock.mockReturnValue({});
    ClientMock.mockImplementation(() => createFakeClient());
  });

  afterEach(() => {
    parseClientOptionsMock.mockReset();
    ClientMock.mockReset();
  });

  it('calls `parseClientOptions` with the correct parameters', () => {
    configureClient(config, { logger, type: 'test', scoped: false });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, false);

    parseClientOptionsMock.mockClear();

    configureClient(config, { logger, type: 'test', scoped: true });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, true);
  });

  it('constructs a client using the options returned by `parseClientOptions`', () => {
    const parsedOptions = {
      nodes: ['http://localhost'],
    };
    parseClientOptionsMock.mockReturnValue(parsedOptions);

    const client = configureClient(config, { logger, type: 'test', scoped: false });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(expect.objectContaining(parsedOptions));
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('listens to client on `response` events', () => {
    const client = configureClient(config, { logger, type: 'test', scoped: false });

    expect(client.on).toHaveBeenCalledTimes(1);
    expect(client.on).toHaveBeenCalledWith('response', expect.any(Function));
  });

  describe('Client logging', () => {
    function createResponseWithBody(body?: RequestBody) {
      return createApiResponse({
        body: {},
        statusCode: 200,
        params: {
          method: 'GET',
          path: '/foo',
          querystring: { hello: 'dolly' },
          body,
        },
      });
    }

    describe('logs each query', () => {
      it('creates a query logger context based on the `type` parameter', () => {
        configureClient(createFakeConfig(), { logger, type: 'test123' });
        expect(logger.get).toHaveBeenCalledWith('query', 'test123');
      });

      it('when request body is an object', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        const response = createResponseWithBody({
          seq_no_primary_term: true,
          query: {
            term: { user: 'kimchy' },
          },
        });

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "200
                  GET /foo?hello=dolly
                  {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}",
                    ],
                  ]
              `);
      });

      it('when request body is a string', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        const response = createResponseWithBody(
          JSON.stringify({
            seq_no_primary_term: true,
            query: {
              term: { user: 'kimchy' },
            },
          })
        );

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "200
                  GET /foo?hello=dolly
                  {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}",
                    ],
                  ]
              `);
      });

      it('when request body is a buffer', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

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

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "200
          GET /foo?hello=dolly
          [buffer]",
            ],
          ]
        `);
      });

      it('when request body is a readable stream', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

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

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "200
          GET /foo?hello=dolly
          [stream]",
            ],
          ]
        `);
      });

      it('when request body is not defined', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        const response = createResponseWithBody();

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "200
          GET /foo?hello=dolly",
            ],
          ]
        `);
      });

      it('properly encode queries', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        const response = createApiResponse({
          body: {},
          statusCode: 200,
          params: {
            method: 'GET',
            path: '/foo',
            querystring: { city: 'Münich' },
          },
        });

        client.emit('response', null, response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "200
                  GET /foo?city=M%C3%BCnich",
                    ],
                  ]
              `);
      });

      it('logs queries even in case of errors', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

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
        client.emit('response', new errors.ResponseError(response), response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "500
          GET /foo?hello=dolly
          {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}} [internal server error]: internal server error",
            ],
          ]
        `);
      });

      it('logs debug when the client emits an @elastic/elasticsearch error', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        const response = createApiResponse({ body: {} });
        client.emit('response', new errors.TimeoutError('message', response), response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "[TimeoutError]: message",
                    ],
                  ]
              `);
      });

      it('logs debug when the client emits an ResponseError returned by elasticsearch', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

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
        client.emit('response', new errors.ResponseError(response), response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "400
          GET /_path?hello=dolly [illegal_argument_exception]: request [/_path] contains unrecognized parameter: [name]",
            ],
          ]
        `);
      });

      it('logs default error info when the error response body is empty', () => {
        const client = configureClient(createFakeConfig(), { logger, type: 'test', scoped: false });

        let response = createApiResponse({
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
        client.emit('response', new errors.ResponseError(response), response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "400
          GET /_path [undefined]: Response Error",
            ],
          ]
        `);

        logger.debug.mockClear();

        response = createApiResponse({
          statusCode: 400,
          headers: {},
          params: {
            method: 'GET',
            path: '/_path',
          },
          body: {} as any,
        });
        client.emit('response', new errors.ResponseError(response), response);

        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "400
          GET /_path [undefined]: Response Error",
            ],
          ]
        `);
      });
    });
  });
});
