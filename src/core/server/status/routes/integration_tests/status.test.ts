/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import supertest from 'supertest';
import { omit } from 'lodash';

import { createCoreContext, createHttpServer } from '../../../http/test_utils';
import { ContextService } from '../../../context';
import { metricsServiceMock } from '../../../metrics/metrics_service.mock';
import { MetricsServiceSetup } from '../../../metrics';
import { HttpService, InternalHttpServiceSetup } from '../../../http';

import { registerStatusRoute } from '../status';
import { ServiceStatus, ServiceStatusLevels } from '../../types';
import { statusServiceMock } from '../../status_service.mock';

const coreId = Symbol('core');

describe('GET /api/status', () => {
  let server: HttpService;
  let httpSetup: InternalHttpServiceSetup;
  let metrics: jest.Mocked<MetricsServiceSetup>;

  const setupServer = async ({ allowAnonymous = true }: { allowAnonymous?: boolean } = {}) => {
    const coreContext = createCoreContext({ coreId });
    const contextService = new ContextService(coreContext);

    server = createHttpServer(coreContext);
    httpSetup = await server.setup({
      context: contextService.setup({ pluginDependencies: new Map() }),
    });

    metrics = metricsServiceMock.createSetupContract();
    const status = statusServiceMock.createSetupContract();
    const pluginsStatus$ = new BehaviorSubject<Record<string, ServiceStatus>>({
      a: { level: ServiceStatusLevels.available, summary: 'a is available' },
      b: { level: ServiceStatusLevels.degraded, summary: 'b is degraded' },
      c: { level: ServiceStatusLevels.unavailable, summary: 'c is unavailable' },
      d: { level: ServiceStatusLevels.critical, summary: 'd is critical' },
    });

    const router = httpSetup.createRouter('');
    registerStatusRoute({
      router,
      config: {
        allowAnonymous,
        packageInfo: {
          branch: 'xbranch',
          buildNum: 1234,
          buildSha: 'xsha',
          dist: true,
          version: '9.9.9-SNAPSHOT',
        },
        serverName: 'xkibana',
        uuid: 'xxxx-xxxxx',
      },
      metrics,
      status: {
        overall$: status.overall$,
        core$: status.core$,
        plugins$: pluginsStatus$,
      },
    });

    // Register dummy auth provider for testing auth
    httpSetup.registerAuth((req, res, auth) => {
      if (req.headers.authorization === 'let me in') {
        return auth.authenticated();
      } else {
        return auth.notHandled();
      }
    });

    await server.start();
  };

  afterEach(async () => {
    await server.stop();
  });

  describe('allowAnonymous: false', () => {
    it('rejects requests with no credentials', async () => {
      await setupServer({ allowAnonymous: false });
      await supertest(httpSetup.server.listener).get('/api/status').expect(401);
    });

    it('rejects requests with bad credentials', async () => {
      await setupServer({ allowAnonymous: false });
      await supertest(httpSetup.server.listener)
        .get('/api/status')
        .set('Authorization', 'fake creds')
        .expect(401);
    });

    it('accepts authenticated requests', async () => {
      await setupServer({ allowAnonymous: false });
      await supertest(httpSetup.server.listener)
        .get('/api/status')
        .set('Authorization', 'let me in')
        .expect(200);
    });
  });

  it('returns basic server info & metrics', async () => {
    await setupServer();
    const result = await supertest(httpSetup.server.listener).get('/api/status').expect(200);

    expect(result.body.name).toEqual('xkibana');
    expect(result.body.uuid).toEqual('xxxx-xxxxx');
    expect(result.body.version).toEqual({
      number: '9.9.9',
      build_hash: 'xsha',
      build_number: 1234,
      build_snapshot: true,
    });
    const metricsMockValue = await metrics.getOpsMetrics$().pipe(first()).toPromise();
    expect(result.body.metrics).toEqual({
      last_updated: expect.any(String),
      collection_interval_in_millis: metrics.collectionInterval,
      ...omit(metricsMockValue, ['collected_at']),
      requests: {
        ...metricsMockValue.requests,
        status_codes: metricsMockValue.requests.statusCodes,
      },
    });
  });

  describe('legacy status format', () => {
    it('returns legacy status format when no query params provided', async () => {
      await setupServer();
      const result = await supertest(httpSetup.server.listener).get('/api/status').expect(200);
      expect(result.body.status).toEqual({
        overall: {
          icon: 'success',
          nickname: 'Looking good',
          since: expect.any(String),
          state: 'green',
          title: 'Green',
          uiColor: 'secondary',
        },
        statuses: [
          {
            icon: 'success',
            id: 'core:elasticsearch@9.9.9',
            message: 'Service is working',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'success',
            id: 'core:savedObjects@9.9.9',
            message: 'Service is working',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'success',
            id: 'plugin:a@9.9.9',
            message: 'a is available',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'warning',
            id: 'plugin:b@9.9.9',
            message: 'b is degraded',
            since: expect.any(String),
            state: 'yellow',
            uiColor: 'warning',
          },
          {
            icon: 'danger',
            id: 'plugin:c@9.9.9',
            message: 'c is unavailable',
            since: expect.any(String),
            state: 'red',
            uiColor: 'danger',
          },
          {
            icon: 'danger',
            id: 'plugin:d@9.9.9',
            message: 'd is critical',
            since: expect.any(String),
            state: 'red',
            uiColor: 'danger',
          },
        ],
      });
    });

    it('returns legacy status format when v8format=false is provided', async () => {
      await setupServer();
      const result = await supertest(httpSetup.server.listener)
        .get('/api/status?v8format=false')
        .expect(200);
      expect(result.body.status).toEqual({
        overall: {
          icon: 'success',
          nickname: 'Looking good',
          since: expect.any(String),
          state: 'green',
          title: 'Green',
          uiColor: 'secondary',
        },
        statuses: [
          {
            icon: 'success',
            id: 'core:elasticsearch@9.9.9',
            message: 'Service is working',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'success',
            id: 'core:savedObjects@9.9.9',
            message: 'Service is working',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'success',
            id: 'plugin:a@9.9.9',
            message: 'a is available',
            since: expect.any(String),
            state: 'green',
            uiColor: 'secondary',
          },
          {
            icon: 'warning',
            id: 'plugin:b@9.9.9',
            message: 'b is degraded',
            since: expect.any(String),
            state: 'yellow',
            uiColor: 'warning',
          },
          {
            icon: 'danger',
            id: 'plugin:c@9.9.9',
            message: 'c is unavailable',
            since: expect.any(String),
            state: 'red',
            uiColor: 'danger',
          },
          {
            icon: 'danger',
            id: 'plugin:d@9.9.9',
            message: 'd is critical',
            since: expect.any(String),
            state: 'red',
            uiColor: 'danger',
          },
        ],
      });
    });
  });

  describe('v8format', () => {
    it('returns new status format when v8format=true is provided', async () => {
      await setupServer();
      const result = await supertest(httpSetup.server.listener)
        .get('/api/status?v8format=true')
        .expect(200);
      expect(result.body.status).toEqual({
        core: {
          elasticsearch: {
            level: 'available',
            summary: 'Service is working',
          },
          savedObjects: {
            level: 'available',
            summary: 'Service is working',
          },
        },
        overall: {
          level: 'available',
          summary: 'Service is working',
        },
        plugins: {
          a: {
            level: 'available',
            summary: 'a is available',
          },
          b: {
            level: 'degraded',
            summary: 'b is degraded',
          },
          c: {
            level: 'unavailable',
            summary: 'c is unavailable',
          },
          d: {
            level: 'critical',
            summary: 'd is critical',
          },
        },
      });
    });
  });
});
