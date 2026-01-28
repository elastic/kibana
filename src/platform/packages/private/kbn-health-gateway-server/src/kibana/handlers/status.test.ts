/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Server } from '@hapi/hapi';
import { duration } from 'moment';
import { URL } from 'url';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaConfig } from '../kibana_config';
import { StatusHandler } from './status';

const mockedFetch = jest.spyOn(global, 'fetch');

// Helper to create Response - status 204 and 304 don't allow a body
const createResponse = (body: string, init: ResponseInit) => {
  const isNullBodyStatus = init.status === 204 || init.status === 304;
  return new Response(isNullBodyStatus ? null : body, init);
};

describe('StatusHandler', () => {
  let kibanaConfig: KibanaConfig;
  let logger: MockedLogger;
  let server: Server;

  beforeEach(async () => {
    kibanaConfig = {
      hosts: ['http://localhost:5601'],
      requestTimeout: duration(60, 's'),
    } as unknown as typeof kibanaConfig;
    logger = loggerMock.create();

    server = new Server();
    server.route({
      method: 'GET',
      path: '/',
      handler: new StatusHandler(kibanaConfig, logger).handler,
    });
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
    const unauthorized = { status: 401, headers: new Headers({ 'www-authenticate': '' }) };
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
        mockedFetch.mockResolvedValueOnce(createResponse('', config));

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
      mockedFetch.mockRejectedValueOnce(new Error('Fetch Error'));
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
      mockedFetch.mockImplementationOnce((url, options) => {
        return new Promise((resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Fetch Aborted', 'AbortError'));
          });

          jest.advanceTimersByTime(60000);
        });
      });

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
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("should return 'healthy' only when all the hosts healthy", async () => {
      kibanaConfig.hosts.push('http://localhost:5602');

      mockedFetch
        .mockResolvedValueOnce(createResponse('', ok))
        .mockResolvedValueOnce(createResponse('', unauthorized));

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

      mockedFetch
        .mockResolvedValueOnce(createResponse('', ok))
        .mockResolvedValueOnce(createResponse('', serverError));

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

    it('should call the host with the correct path', async () => {
      kibanaConfig.hosts.splice(0, kibanaConfig.hosts.length);
      kibanaConfig.hosts.push('http://localhost:5601', 'http://localhost:5602');

      mockedFetch.mockResolvedValue(createResponse('', ok));

      await server.inject({
        method: 'get',
        url: '/',
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenCalledWith(
        new URL('http://localhost:5601/api/status'),
        expect.any(Object)
      );
      expect(mockedFetch).toHaveBeenCalledWith(
        new URL('http://localhost:5602/api/status'),
        expect.any(Object)
      );
    });

    it('should append the status path when path already present on the host', async () => {
      kibanaConfig.hosts.splice(0, kibanaConfig.hosts.length);
      kibanaConfig.hosts.push('http://localhost:5601/prefix', 'http://localhost:5602/other/path');

      mockedFetch.mockResolvedValue(createResponse('', ok));

      await server.inject({
        method: 'get',
        url: '/',
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenCalledWith(
        new URL('http://localhost:5601/prefix/api/status'),
        expect.any(Object)
      );
      expect(mockedFetch).toHaveBeenCalledWith(
        new URL('http://localhost:5602/other/path/api/status'),
        expect.any(Object)
      );
    });
  });
});
