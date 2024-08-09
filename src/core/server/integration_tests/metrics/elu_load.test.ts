/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createHttpService } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-browser-mocks';
import { Server } from '@hapi/hapi';
import { MetricsService } from '@kbn/core-metrics-server-internal';
import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/repo-info';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import moment from 'moment';

describe('GET /api/_elu_load', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let server: ReturnType<typeof createHttpService>;
  let listener: Server['listener'];
  let service: MetricsService;
  beforeEach(async () => {
    logger = loggingSystemMock.create();
    server = createHttpService({ logger });
    service = new MetricsService({
      coreId: Symbol('core'),
      env: Env.createDefault(REPO_ROOT, getEnvOptions()),
      logger: loggingSystemMock.create(),
      configService: configServiceMock.create({ atPath: { interval: moment.duration('1s') } }),
    });
    await server.preboot({ context: contextServiceMock.createPrebootContract() });
    const httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });
    listener = httpSetup.server.listener;
    await service.setup({
      http: httpSetup,
      elasticsearchService: elasticsearchServiceMock.createInternalSetup(),
    });
    await server.start();
  });

  afterEach(async () => {
    await service.stop();
    await server.stop();
  });

  it('gets ELU load average', async () => {
    const { body } = await supertest(listener)
      .get('/api/_elu_history')
      .query({ apiVersion: '1', elasticInternalOrigin: 'true' })
      .expect(200);
    expect(body).toEqual({
      history: {
        short: expect.any(Number),
        medium: expect.any(Number),
        long: expect.any(Number),
      },
    });

    expect(body.history.short).toBeGreaterThanOrEqual(0);
    expect(body.history.short).toBeLessThanOrEqual(1);

    expect(body.history.medium).toBeGreaterThanOrEqual(0);
    expect(body.history.medium).toBeLessThanOrEqual(1);

    expect(body.history.long).toBeGreaterThanOrEqual(0);
    expect(body.history.long).toBeLessThanOrEqual(1);
  });
});
