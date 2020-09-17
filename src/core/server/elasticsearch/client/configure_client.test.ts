/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Buffer } from 'buffer';
import { Readable } from 'stream';

import { RequestEvent, errors } from '@elastic/elasticsearch';
import { TransportRequestParams, RequestBody } from '@elastic/elasticsearch/lib/Transport';

import { parseClientOptionsMock, ClientMock } from './configure_client.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import EventEmitter from 'events';
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
    configureClient(config, { logger, scoped: false });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, false);

    parseClientOptionsMock.mockClear();

    configureClient(config, { logger, scoped: true });

    expect(parseClientOptionsMock).toHaveBeenCalledTimes(1);
    expect(parseClientOptionsMock).toHaveBeenCalledWith(config, true);
  });

  it('constructs a client using the options returned by `parseClientOptions`', () => {
    const parsedOptions = {
      nodes: ['http://localhost'],
    };
    parseClientOptionsMock.mockReturnValue(parsedOptions);

    const client = configureClient(config, { logger, scoped: false });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledWith(parsedOptions);
    expect(client).toBe(ClientMock.mock.results[0].value);
  });

  it('listens to client on `response` events', () => {
    const client = configureClient(config, { logger, scoped: false });

    expect(client.on).toHaveBeenCalledTimes(1);
    expect(client.on).toHaveBeenCalledWith('response', expect.any(Function));
  });

  describe('Client logging', () => {
    it('logs error when the client emits an @elastic/elasticsearch error', () => {
      const client = configureClient(config, { logger, scoped: false });

      const response = createApiResponse({ body: {} });
      client.emit('response', new errors.TimeoutError('message', response), response);

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "[TimeoutError]: message",
          ],
        ]
      `);
    });

    it('logs error when the client emits an ResponseError returned by elasticsearch', () => {
      const client = configureClient(config, { logger, scoped: false });

      const response = createApiResponse({
        statusCode: 400,
        headers: {},
        body: {
          error: {
            type: 'illegal_argument_exception',
            reason: 'request [/_path] contains unrecognized parameter: [name]',
          },
        },
      });
      client.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "[illegal_argument_exception]: request [/_path] contains unrecognized parameter: [name]",
          ],
        ]
      `);
    });

    it('logs default error info when the error response body is empty', () => {
      const client = configureClient(config, { logger, scoped: false });

      let response = createApiResponse({
        statusCode: 400,
        headers: {},
        body: {
          error: {},
        },
      });
      client.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "[ResponseError]: Response Error",
          ],
        ]
      `);

      logger.error.mockClear();

      response = createApiResponse({
        statusCode: 400,
        headers: {},
        body: {} as any,
      });
      client.emit('response', new errors.ResponseError(response), response);

      expect(loggingSystemMock.collect(logger).error).toMatchInlineSnapshot(`
        Array [
          Array [
            "[ResponseError]: Response Error",
          ],
        ]
      `);
    });

    describe('logs each queries if `logQueries` is true', () => {
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

      it('when request body is an object', () => {
        const client = configureClient(
          createFakeConfig({
            logQueries: true,
          }),
          { logger, scoped: false }
        );

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
                      Object {
                        "tags": Array [
                          "query",
                        ],
                      },
                    ],
                  ]
              `);
      });

      it('when request body is a string', () => {
        const client = configureClient(
          createFakeConfig({
            logQueries: true,
          }),
          { logger, scoped: false }
        );

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
                      Object {
                        "tags": Array [
                          "query",
                        ],
                      },
                    ],
                  ]
              `);
      });

      it('when request body is a buffer', () => {
        const client = configureClient(
          createFakeConfig({
            logQueries: true,
          }),
          { logger, scoped: false }
        );

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
              Object {
                "tags": Array [
                  "query",
                ],
              },
            ],
          ]
        `);
      });

      it('when request body is a readable stream', () => {
        const client = configureClient(
          createFakeConfig({
            logQueries: true,
          }),
          { logger, scoped: false }
        );

        const response = createResponseWithBody(
          // @ts-expect-error definition doesn't know about from
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
              Object {
                "tags": Array [
                  "query",
                ],
              },
            ],
          ]
        `);
      });

      it('when request body is not defined', () => {
        const client = configureClient(
          createFakeConfig({
            logQueries: true,
          }),
          { logger, scoped: false }
        );

        const response = createResponseWithBody();

        client.emit('response', null, response);
        expect(loggingSystemMock.collect(logger).debug).toMatchInlineSnapshot(`
          Array [
            Array [
              "200
          GET /foo?hello=dolly",
              Object {
                "tags": Array [
                  "query",
                ],
              },
            ],
          ]
        `);
      });
    });

    it('properly encode queries', () => {
      const client = configureClient(
        createFakeConfig({
          logQueries: true,
        }),
        { logger, scoped: false }
      );

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
            Object {
              "tags": Array [
                "query",
              ],
            },
          ],
        ]
      `);
    });

    it('logs queries even in case of errors if `logQueries` is true', () => {
      const client = configureClient(
        createFakeConfig({
          logQueries: true,
        }),
        { logger, scoped: false }
      );

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
        {\\"seq_no_primary_term\\":true,\\"query\\":{\\"term\\":{\\"user\\":\\"kimchy\\"}}}",
            Object {
              "tags": Array [
                "query",
              ],
            },
          ],
        ]
      `);
    });

    it('does not log queries if `logQueries` is false', () => {
      const client = configureClient(
        createFakeConfig({
          logQueries: false,
        }),
        { logger, scoped: false }
      );

      const response = createApiResponse({
        body: {},
        statusCode: 200,
        params: {
          method: 'GET',
          path: '/foo',
        },
      });

      client.emit('response', null, response);

      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
