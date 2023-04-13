/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Supertest from 'supertest';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createHttpServer } from '@kbn/core-http-server-mocks';
import type { HttpService } from '@kbn/core-http-server-internal';

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;

const contextSetup = contextServiceMock.createSetupContract();

const setupDeps = {
  context: contextSetup,
  executionContext: executionContextServiceMock.createInternalSetupContract(),
};

beforeEach(async () => {
  logger = loggingSystemMock.create();
  server = createHttpServer({ logger });
  await server.preboot({ context: contextServiceMock.createPrebootContract() });
});

afterEach(async () => {
  await server.stop();
});

describe('Routing versioned requests', () => {
  it('routes requests to the expected handlers', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const supertest = Supertest(innerServer.listener);

    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '1' } });
      })
      .addVersion({ validate: false, version: '2' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '2' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '1')
        .expect(200)
        .then(({ body: { v } }) => v)
    ).resolves.toBe('1');

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2')
        .expect(200)
        .then(({ body: { v } }) => v)
    ).resolves.toBe('2');
  });

  it('handles non-existent version', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const supertest = Supertest(innerServer.listener);

    router.versioned.get({ path: '/my-path', access: 'internal' }); // do not actually register any versions
    await server.start();

    await supertest.get('/my-path').set('Elastic-Api-Version', '2').expect(406);
  });

  it('handles missing version header', async () => {
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    const supertest = Supertest(innerServer.listener);

    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '1' } });
      })
      .addVersion({ validate: false, version: '2' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '2' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .expect(406)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Version expected at/),
      })
    );
  });
});
