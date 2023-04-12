/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Supertest from 'supertest';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createHttpServer } from '@kbn/core-http-server-mocks';
import type { HttpService } from '@kbn/core-http-server-internal';
import type { IRouterWithVersion } from '@kbn/core-http-server';

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;

describe('Routing versioned requests', () => {
  const contextSetup = contextServiceMock.createSetupContract();
  let router: IRouterWithVersion;
  let supertest: Supertest.SuperTest<Supertest.Test>;

  const setupDeps = {
    context: contextSetup,
    executionContext: executionContextServiceMock.createInternalSetupContract(),
  };

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    server = createHttpServer({ logger });
    await server.preboot({ context: contextServiceMock.createPrebootContract() });
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    router = createRouter('/');
    supertest = Supertest(innerServer.listener);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('routes requests to the expected handlers', async () => {
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
    router.versioned.get({ path: '/my-path', access: 'internal' }); // do not actually register any versions
    await server.start();

    await supertest.get('/my-path').set('Elastic-Api-Version', '2').expect(400);
  });

  it('handles missing version header', async () => {
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
        .expect(400)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Version expected at/),
      })
    );
  });

  it('returns the expected output for badly formatted versions', async () => {
    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '1' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', 'abc')
        .expect(400)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Invalid version/),
      })
    );
  });

  it('returns the expected output for failed validation', async () => {
    router.versioned
      .post({ access: 'internal', path: '/test/{id}' })
      .addVersion(
        { validate: { request: { body: schema.object({ foo: schema.number() }) } }, version: '1' },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      );

    await server.start();

    await expect(
      supertest
        .post('/test/1')
        .send({})
        .set('Elastic-Api-Version', '1')
        .expect(400)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'Bad Request',
        message: expect.stringMatching(/expected value of type/),
      })
    );
  });
});
