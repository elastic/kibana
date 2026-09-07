/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockSetHttpRouteHeapProfileLabels = jest.fn();

jest.mock('@kbn/core-http-router-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-http-router-server-internal');
  return {
    ...actual,
    setHttpRouteHeapProfileLabels: (request: unknown) => mockSetHttpRouteHeapProfileLabels(request),
  };
});

import { ByteSizeValue } from '@kbn/config-schema';
import { Router, type RouterOptions } from '@kbn/core-http-router-server-internal';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import moment from 'moment';
import supertest from 'supertest';
import type { HttpConfig } from './http_config';
import { HttpServer } from './http_server';

const options = getEnvOptions();
options.cliArgs.dev = false;
const env = createTestEnv({ envOptions: options });

const routerOptions: RouterOptions = {
  env,
  versionedRouterOptions: {
    defaultHandlerResolutionStrategy: 'oldest',
    useVersionResolutionStrategyForInternalPaths: [],
  },
};

const coreContext = mockCoreContext.create();
const logger = coreContext.logger.get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

describe('HttpServer heap-profile route labels', () => {
  let server: HttpServer;
  let config$: Observable<HttpConfig>;

  beforeEach(() => {
    mockSetHttpRouteHeapProfileLabels.mockClear();
    const config = {
      name: 'kibana',
      host: '127.0.0.1',
      maxPayload: new ByteSizeValue(1024),
      port: 10012,
      ssl: { enabled: false },
      compression: { enabled: true, brotli: { enabled: false, quality: 3 } },
      requestId: {
        allowFromAnyIp: true,
        ipAllowlist: [],
      },
      cors: { enabled: false },
      csp: { disableEmbedding: true },
      cdn: {},
      shutdownTimeout: moment.duration(500, 'ms'),
    } as unknown as HttpConfig;
    config$ = of(config);
    server = new HttpServer(coreContext, 'tests', of(config.shutdownTimeout));
  });

  afterEach(async () => {
    await server.stop();
  });

  test('sets route labels during onPreAuth and again after the handler', async () => {
    const order: string[] = [];
    mockSetHttpRouteHeapProfileLabels.mockImplementation(() => {
      order.push('labels');
    });

    const router = new Router('/foo', logger, enhanceWithContext, routerOptions);
    router.get(
      {
        path: '/bar',
        validate: false,
        security: { authz: { requiredPrivileges: ['foo'] } },
      },
      (context, req, res) => {
        order.push('handler');
        return res.ok({ body: { ok: true } });
      }
    );

    const { registerRouter, server: innerServer } = await server.setup({ config$ });
    registerRouter(router);
    await server.start();

    await supertest(innerServer.listener).get('/foo/bar').expect(200);

    expect(mockSetHttpRouteHeapProfileLabels.mock.calls.length).toBeGreaterThanOrEqual(2);
    const request = mockSetHttpRouteHeapProfileLabels.mock.calls[0][0] as {
      method: string;
      route: { path: string };
    };
    expect(request.route.path).toBe('/foo/bar');
    expect(request.method).toBe('get');
    expect(order[0]).toBe('labels');
    expect(order).toContain('handler');
    expect(order.lastIndexOf('labels')).toBeGreaterThan(order.indexOf('handler'));
  });
});
