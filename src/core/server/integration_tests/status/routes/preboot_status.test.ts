/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { createCoreContext, createHttpService } from '@kbn/core-http-server-mocks';
import type { HttpService, InternalHttpServicePreboot } from '@kbn/core-http-server-internal';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';

import { registerPrebootStatusRoute } from '@kbn/core-status-server-internal/src/routes';

const coreId = Symbol('core');

describe('GET /api/status', () => {
  let server: HttpService;
  let httpPreboot: InternalHttpServicePreboot;

  const setupServer = async () => {
    const coreContext = createCoreContext({ coreId });

    server = createHttpService(coreContext);
    httpPreboot = await server.preboot({
      context: contextServiceMock.createPrebootContract(),
    });

    httpPreboot.registerRoutes('', (router) => {
      registerPrebootStatusRoute({ router });
    });
  };

  afterEach(async () => {
    await server.stop();
  });

  it('respond with a 503 and with redacted status', async () => {
    await setupServer();
    const response = await supertest(httpPreboot.server.listener).get('/api/status').expect(503);
    expect(response.body).toEqual({ status: { overall: { level: 'unavailable' } } });
  });
});
