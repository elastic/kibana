/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import { duration } from 'moment';
import fetch, { Response } from 'node-fetch';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { KibanaConfig } from '../kibana_config';
import { RootRoute } from './root';

describe('RootRoute', () => {
  let kibanaConfig: KibanaConfig;
  let logger: MockedLogger;
  let server: Server;

  beforeAll(async () => {
    jest.spyOn(await import('node-fetch'), 'default');
  });

  beforeEach(async () => {
    kibanaConfig = {
      hosts: ['http://localhost:5601'],
      requestTimeout: duration(60, 's'),
    } as unknown as typeof kibanaConfig;
    logger = loggerMock.create();

    server = new Server();
    server.route(new RootRoute(kibanaConfig, logger));
    await server.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('handler', () => {
    const ok = { status: 200 };
    const noContent = { status: 204 };
    const found = { status: 302 };
    const badRequest = { status: 400 };
    const unauthorized = { status: 401, headers: { 'www-authenticate': '' } };
    const forbidden = { status: 403 };
    const notFound = { status: 404 };
    const serverError = { status: 500 };
    const badGateway = { status: 502 };
    const unavailable = { status: 503 };
    const timeout = { status: 504 };

    it.each`
      config          | status         | code
      ${ok}           | ${'healthy'}   | ${200}
      ${noContent}    | ${'healthy'}   | ${200}
      ${found}        | ${'healthy'}   | ${200}
      ${unauthorized} | ${'healthy'}   | ${200}
      ${forbidden}    | ${'unhealthy'} | ${503}
      ${notFound}     | ${'unhealthy'} | ${503}
      ${badRequest}   | ${'unhealthy'} | ${503}
      ${serverError}  | ${'unhealthy'} | ${503}
      ${badGateway}   | ${'unhealthy'} | ${503}
      ${unavailable}  | ${'unhealthy'} | ${503}
      ${timeout}      | ${'unhealthy'} | ${503}
    `(
      "should return '$status' with $code when Kibana host returns $config.status",
      async ({ config, status, code }) => {
        (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
          new Response('', config)
        );

        const response = server.inject({
          method: 'get',
          url: '/',
        });

        await expect(response).resolves.toEqual(
          expect.objectContaining({
            statusCode: code,
            result: expect.objectContaining({
              status,
              hosts: [
                expect.objectContaining({
                  status,
                  code: config.status,
                  host: 'http://localhost:5601',
                }),
              ],
            }),
          })
        );
      }
    );

    it("should return 'failure' with 502 when `fetch` throws an error", async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Fetch Error'));
      const response = server.inject({
        method: 'get',
        url: '/',
      });

      await expect(response).resolves.toEqual(
        expect.objectContaining({
          statusCode: 502,
          result: expect.objectContaining({
            status: 'failure',
            hosts: [
              expect.objectContaining({
                status: 'failure',
                host: 'http://localhost:5601',
              }),
            ],
          }),
        })
      );
    });

    it("should return 'timeout' with 504 when `fetch` timeouts", async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        (url, { signal } = {}) => {
          return new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => {
              reject(new DOMException('Fetch Aborted', 'AbortError'));
            });

            jest.advanceTimersByTime(60000);
          });
        }
      );

      jest.useFakeTimers({ doNotFake: ['nextTick'] });

      const response = server.inject({
        method: 'get',
        url: '/',
      });

      try {
        await expect(response).resolves.toEqual(
          expect.objectContaining({
            statusCode: 504,
            result: expect.objectContaining({
              status: 'timeout',
              hosts: [
                expect.objectContaining({
                  status: 'timeout',
                  host: 'http://localhost:5601',
                }),
              ],
            }),
          })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("should always return 'healthy' when there are no hosts", async () => {
      kibanaConfig.hosts.splice(0);

      const response = server.inject({
        method: 'get',
        url: '/',
      });

      await expect(response).resolves.toEqual(
        expect.objectContaining({
          statusCode: 200,
          result: expect.objectContaining({
            status: 'healthy',
            hosts: [],
          }),
        })
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return 'healthy' only when all the hosts healthy", async () => {
      kibanaConfig.hosts.push('http://localhost:5602');

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(new Response('', ok))
        .mockResolvedValueOnce(new Response('', unauthorized));

      const response = server.inject({
        method: 'get',
        url: '/',
      });

      await expect(response).resolves.toEqual(
        expect.objectContaining({
          statusCode: 200,
          result: expect.objectContaining({
            status: 'healthy',
            hosts: expect.arrayContaining([
              expect.objectContaining({
                status: 'healthy',
                code: ok.status,
                host: 'http://localhost:5601',
              }),
              expect.objectContaining({
                status: 'healthy',
                code: unauthorized.status,
                host: 'http://localhost:5602',
              }),
            ]),
          }),
        })
      );
    });

    it("should return 'unhealthy' when at least one host is not healthy", async () => {
      kibanaConfig.hosts.push('http://localhost:5602');

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(new Response('', ok))
        .mockResolvedValueOnce(new Response('', serverError));

      const response = server.inject({
        method: 'get',
        url: '/',
      });

      await expect(response).resolves.toEqual(
        expect.objectContaining({
          statusCode: 503,
          result: expect.objectContaining({
            status: 'unhealthy',
            hosts: expect.arrayContaining([
              expect.objectContaining({
                status: 'healthy',
                code: ok.status,
                host: 'http://localhost:5601',
              }),
              expect.objectContaining({
                status: 'unhealthy',
                code: serverError.status,
                host: 'http://localhost:5602',
              }),
            ]),
          }),
        })
      );
    });
  });
});
