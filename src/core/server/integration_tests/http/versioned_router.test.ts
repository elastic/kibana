/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Supertest from 'supertest';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createHttpServer } from '@kbn/core-http-server-mocks';
import type { HttpService } from '@kbn/core-http-server-internal';
import type { IRouter } from '@kbn/core-http-server';
import type { CliArgs } from '@kbn/config';

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;

describe('Routing versioned requests', () => {
  let router: IRouter;
  let supertest: Supertest.SuperTest<Supertest.Test>;

  async function setupServer(cliArgs: Partial<CliArgs> = {}) {
    logger = loggingSystemMock.create();
    await server?.stop(); // stop the already started server
    server = createHttpServer({
      logger,
      env: createTestEnv({ envOptions: getEnvOptions({ cliArgs }) }),
    });
    await server.preboot({ context: contextServiceMock.createPrebootContract() });
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    router = createRouter('/');
    supertest = Supertest(innerServer.listener);
  }

  const setupDeps = {
    context: contextServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
  };

  beforeEach(async () => {
    await setupServer();
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

  it('handles missing version header (defaults to oldest)', async () => {
    await setupServer({ dev: false });
    router.versioned
      .get({ path: '/my-path', access: 'public' })
      .addVersion({ validate: false, version: '2020-02-02' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '1' } });
      })
      .addVersion({ validate: false, version: '2022-02-02' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '2' } });
      });

    await server.start();

    await expect(supertest.get('/my-path').expect(200)).resolves.toEqual(
      expect.objectContaining({
        body: { v: '1' },
        header: expect.objectContaining({
          'elastic-api-version': '2020-02-02',
        }),
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

  it('returns the expected responses for failed validation', async () => {
    router.versioned
      .post({ path: '/my-path', access: 'internal' })
      // Bad request validation
      .addVersion(
        {
          validate: {
            request: { body: schema.object({ foo: schema.number() }) },
          },
          version: '1',
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      );

    await server.start();

    await expect(
      supertest
        .post('/my-path')
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

  it('returns the version in response headers', async () => {
    router.versioned
      .get({ path: '/my-path', access: 'public' })
      .addVersion({ validate: false, version: '2020-02-02' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '2020-02-02' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2020-02-02')
        .expect(200)
        .then(({ header }) => header)
    ).resolves.toEqual(expect.objectContaining({ 'elastic-api-version': '2020-02-02' }));
  });

  it('runs response validation when in dev', async () => {
    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion(
        { validate: { response: { 200: { body: schema.number() } } }, version: '1' },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      );

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '1')
        .expect(500)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Failed output validation/),
      })
    );
  });

  it('does not run response validation in prod', async () => {
    await setupServer({ dev: false });

    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion(
        { validate: { response: { 200: { body: schema.number() } } }, version: '1' },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      );

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '1')
        .expect(200)
        .then(({ body }) => body.v)
    ).resolves.toEqual('1');
  });

  it('requires version headers to be set for internal HTTP APIs', async () => {
    await setupServer({ dev: false });

    router.versioned
      .get({ path: '/my-path', access: 'internal' })
      .addVersion(
        { version: '1', validate: { response: { 200: { body: schema.number() } } } },
        async (ctx, req, res) => res.ok()
      )
      .addVersion(
        { version: '2', validate: { response: { 200: { body: schema.number() } } } },
        async (ctx, req, res) => res.ok()
      );
    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .unset('Elastic-Api-Version')
        .expect(400)
        .then(({ body }) => body.message)
    ).resolves.toMatch(/Please specify.+version/);
  });

  it.each([
    ['public', '2022-02-02', '2022-02-03'],
    ['internal', '1', '2'],
  ])('requires version headers to be set %p when in dev', async (access, v1, v2) => {
    await setupServer({ dev: true });
    router.versioned
      .get({ path: '/my-path', access: access as 'internal' | 'public' })
      .addVersion(
        { version: v1, validate: { response: { 200: { body: schema.number() } } } },
        async (ctx, req, res) => res.ok()
      )
      .addVersion(
        { version: v2, validate: { response: { 200: { body: schema.number() } } } },
        async (ctx, req, res) => res.ok()
      );
    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .unset('Elastic-Api-Version')
        .expect(400)
        .then(({ body }) => body.message)
    ).resolves.toMatch(/Please specify.+version/);
  });

  it('errors when no handler could be found', async () => {
    router.versioned.get({ path: '/my-path', access: 'public' });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2020-02-02')
        .expect(500)
        .then(({ body }) => body)
    ).resolves.toEqual(
      expect.objectContaining({ message: expect.stringMatching(/No handlers registered/) })
    );
  });

  it('resolves the newest handler on serverless', async () => {
    await setupServer({ serverless: true, dev: false });

    router.versioned
      .get({ path: '/my-path', access: 'public' })
      .addVersion({ validate: false, version: '2023-04-04' }, async (ctx, req, res) => {
        return res.ok({ body: { v: 'oldest' } });
      })
      .addVersion({ validate: false, version: '2024-04-04' }, async (ctx, req, res) => {
        return res.ok({ body: { v: 'newest' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .expect(200)
        .then(({ body }) => body.v)
    ).resolves.toEqual('newest');
  });

  it('resolves the oldest handler on anything other than serverless', async () => {
    await setupServer({ serverless: false, dev: false });

    router.versioned
      .get({ path: '/my-path', access: 'public' })
      .addVersion({ validate: false, version: '2023-04-04' }, async (ctx, req, res) => {
        return res.ok({ body: { v: 'oldest' } });
      })
      .addVersion({ validate: false, version: '2024-04-04' }, async (ctx, req, res) => {
        return res.ok({ body: { v: 'newest' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .expect(200)
        .then(({ body }) => body.v)
    ).resolves.toEqual('oldest');
  });
});
