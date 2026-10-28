/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createHttpService } from '@kbn/core-http-server-mocks';
import { HttpService } from '@kbn/core-http-server-internal';

let server: HttpService;
const prebootDeps = {
  context: contextServiceMock.createPrebootContract(),
};
const setupDeps = {
  context: contextServiceMock.createSetupContract(),
  executionContext: executionContextServiceMock.createInternalSetupContract(),
};

beforeEach(async () => {
  server = createHttpService({ logger: loggingSystemMock.create() });
});

afterEach(async () => {
  await server.stop();
});

describe('Preboot HTTP server', () => {
  it('accepts requests before `setup`', async () => {
    const { server: innerPrebootServer, registerRoutes } = await server.preboot(prebootDeps);
    registerRoutes('', (router) => {
      router.get({ path: '/preboot-get', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-get' })
      );
      router.post({ path: '/preboot-post', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-post' })
      );
    });

    // Preboot routes should work now.
    await supertest(innerPrebootServer.listener).get('/preboot-get').expect(200, 'hello-get');
    await supertest(innerPrebootServer.listener).post('/preboot-post').expect(200, 'hello-post');

    // All non-preboot routes should get `503` (e.g. if client tries to access any standard API).
    await supertest(innerPrebootServer.listener)
      .get('/standard-get')
      .expect(503, 'Kibana server is not ready yet');
    await supertest(innerPrebootServer.listener)
      .post('/standard-post')
      .expect(503, 'Kibana server is not ready yet');
  });

  it('accepts requests after `setup`, but before `start`', async () => {
    const { server: innerPrebootServer, registerRoutes } = await server.preboot(prebootDeps);
    registerRoutes('', (router) => {
      router.get({ path: '/preboot-get', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-get' })
      );
      router.post({ path: '/preboot-post', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-post' })
      );
    });

    const { createRouter, server: innerStandardServer } = await server.setup(setupDeps);
    const standardRouter = createRouter('');
    standardRouter.get({ path: '/standard-get', validate: false }, (context, req, res) =>
      res.ok({ body: 'hello-get' })
    );
    standardRouter.post({ path: '/standard-post', validate: false }, (context, req, res) =>
      res.ok({ body: 'hello-post' })
    );

    // Preboot routes should still work.
    await supertest(innerPrebootServer.listener).get('/preboot-get').expect(200, 'hello-get');
    await supertest(innerPrebootServer.listener).post('/preboot-post').expect(200, 'hello-post');

    // All non-preboot routes should still get `503` (e.g. if client tries to access any standard API).
    await supertest(innerPrebootServer.listener)
      .get('/standard-get')
      .expect(503, 'Kibana server is not ready yet');
    await supertest(innerPrebootServer.listener)
      .post('/standard-post')
      .expect(503, 'Kibana server is not ready yet');

    // Standard HTTP server isn't functional yet.
    await supertest(innerStandardServer.listener)
      .get('/standard-get')
      .expect(404, { statusCode: 404, error: 'Not Found', message: 'Not Found' });
    await supertest(innerStandardServer.listener)
      .post('/standard-post')
      .expect(404, { statusCode: 404, error: 'Not Found', message: 'Not Found' });
  });

  it('is not available after `start`', async () => {
    const { server: innerPrebootServer, registerRoutes } = await server.preboot(prebootDeps);
    registerRoutes('', (router) => {
      router.get({ path: '/preboot-get', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-get' })
      );
      router.post({ path: '/preboot-post', validate: false }, (context, req, res) =>
        res.ok({ body: 'hello-post' })
      );
    });

    const { createRouter, server: innerStandardServer } = await server.setup(setupDeps);
    const standardRouter = createRouter('');
    standardRouter.get({ path: '/standard-get', validate: false }, (context, req, res) =>
      res.ok({ body: 'hello-get' })
    );
    standardRouter.post({ path: '/standard-post', validate: false }, (context, req, res) =>
      res.ok({ body: 'hello-post' })
    );

    await server.start();

    // Preboot routes should no longer work.
    await supertest(innerPrebootServer.listener).get('/preboot-get').expect(503, {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Kibana is shutting down and not accepting new incoming requests',
    });
    await supertest(innerPrebootServer.listener).post('/preboot-post').expect(503, {
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Kibana is shutting down and not accepting new incoming requests',
    });

    // Preboot routes should simply become unknown routes for the standard server.
    await supertest(innerStandardServer.listener)
      .get('/preboot-get')
      .expect(404, { statusCode: 404, error: 'Not Found', message: 'Not Found' });
    await supertest(innerStandardServer.listener)
      .post('/preboot-post')
      .expect(404, { statusCode: 404, error: 'Not Found', message: 'Not Found' });

    // All non-preboot routes should finally function as expected (e.g. if client tries to access any standard API).
    await supertest(innerStandardServer.listener).get('/standard-get').expect(200, 'hello-get');
    await supertest(innerStandardServer.listener).post('/standard-post').expect(200, 'hello-post');
  });
});
