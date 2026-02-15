/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { captureErrorMock } from './versioned_router.test.mocks';

import Supertest from 'supertest';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { createConfigService } from '@kbn/core-http-server-mocks';
import type { HttpConfigType, HttpService } from '@kbn/core-http-server-internal';
import type { IRouter } from '@kbn/core-http-server';
import type { CliArgs } from '@kbn/config';
import { ELASTIC_HTTP_VERSION_QUERY_PARAM } from '@kbn/core-http-common';
import { createInternalHttpService } from '../utilities';

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;

interface AdditionalOptions {
  useVersionResolutionStrategyForInternalPaths?: string[];
}

describe('Routing versioned requests', () => {
  let router: IRouter;
  let supertest: Supertest.Agent;

  async function setupServer(cliArgs: Partial<CliArgs> = {}, options: AdditionalOptions = {}) {
    logger = loggingSystemMock.create();
    await server?.stop(); // stop the already started server
    const serverConfig: Partial<HttpConfigType> = {
      versioned: {
        versionResolution: cliArgs.dev ? 'none' : cliArgs.serverless ? 'newest' : 'oldest',
        strictClientVersionCheck: !cliArgs.serverless,
        useVersionResolutionStrategyForInternalPaths:
          options.useVersionResolutionStrategyForInternalPaths ?? [],
      },
    };
    server = createInternalHttpService({
      logger,
      env: createTestEnv({ envOptions: getEnvOptions({ cliArgs }) }),
      configService: createConfigService({
        server: serverConfig,
      }),
    });
    await server.preboot({
      context: contextServiceMock.createPrebootContract(),
      docLinks: docLinksServiceMock.createSetupContract(),
    });
    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    router = createRouter('/');
    supertest = Supertest(innerServer.listener);
  }

  const setupDeps = {
    context: contextServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createInternalSetupContract(),
    userActivity: userActivityServiceMock.createInternalSetupContract(),
  };

  beforeEach(async () => {
    await setupServer();
  });

  afterEach(async () => {
    captureErrorMock.mockReset();
    await server.stop();
  });

  it('routes requests to the expected handlers', async () => {
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
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
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
      .addVersion({ validate: false, version: '2020-02-02' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '1' } });
      })
      .addVersion({ validate: false, version: '2022-02-02' }, async (ctx, req, res) => {
        return res.ok({ body: { v: '2' } });
      });

    await server.start();

    await expect(supertest.get('/my-path').expect(200)).resolves.toMatchObject({
      body: { v: '1' },
      header: expect.objectContaining({
        'elastic-api-version': '2020-02-02',
      }),
    });
  });

  it('returns the expected output for badly formatted versions', async () => {
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
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
    ).resolves.toMatchObject({
      message: expect.stringMatching(/Invalid version/),
    });
  });

  it('returns the expected responses for failed validation', async () => {
    router.versioned
      .post({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
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
      supertest.post('/my-path').send({}).set('Elastic-Api-Version', '1').expect(400)
    ).resolves.toMatchObject({
      body: {
        error: 'Bad Request',
        message: expect.stringMatching(/expected value of type/),
      },
      headers: { 'elastic-api-version': '1' }, // includes version if validation failed
    });
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('returns the version in response headers', async () => {
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
      .addVersion({ validate: false, version: '2023-10-31' }, async (ctx, req, res) => {
        return res.ok({ body: { foo: 'bar' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2023-10-31')
        .expect(200)
        .then(({ header }) => header)
    ).resolves.toMatchObject({ 'elastic-api-version': '2023-10-31' });
  });

  it('returns the version in response headers, even for HTTP resources', async () => {
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
        options: { httpResource: true },
      })
      .addVersion({ validate: false, version: '2023-10-31' }, async (ctx, req, res) => {
        return res.ok({ body: { foo: 'bar' } });
      });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2023-10-31')
        .expect(200)
        .then(({ header }) => header)
    ).resolves.toMatchObject({ 'elastic-api-version': '2023-10-31' });
  });

  it('runs response validation when in dev', async () => {
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion(
        { validate: { response: { 200: { body: () => schema.number() } } }, version: '1' },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '1' } });
        }
      )
      .addVersion(
        {
          validate: {
            response: { 200: { body: () => schema.object({}, { unknowns: 'forbid' }) } },
          },
          version: '2',
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '2' } });
        }
      )
      .addVersion(
        {
          validate: {
            response: { 200: { body: () => schema.object({}, { unknowns: 'allow' }) } },
          },
          version: '3',
        },
        async (ctx, req, res) => {
          return res.ok({ body: { v: '3' } });
        }
      );

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '1')
        .expect(500)
        .then(({ body }) => body)
    ).resolves.toMatchObject({
      message: expect.stringMatching(/Failed output validation/),
    });

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2')
        .expect(500)
        .then(({ body }) => body)
    ).resolves.toMatchObject({
      message: expect.stringMatching(/Failed output validation/),
    });

    // This should pass response validation
    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '3')
        .expect(200)
        .then(({ body }) => body)
    ).resolves.toMatchObject({
      v: '3',
    });

    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('does not run response validation in prod', async () => {
    await setupServer({ dev: false });

    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion(
        { validate: { response: { 200: { body: () => schema.number() } } }, version: '1' },
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

  it('defaults to v1 for internal HTTP APIs to allow gracefully onboarding internal routes to versioned router', async () => {
    await setupServer({ dev: false });

    router.versioned
      .get({
        path: '/my-internal-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion(
        { version: '1', validate: { response: { 200: { body: () => schema.number() } } } },
        async (ctx, req, res) => res.ok({ body: 'v1' })
      )
      .addVersion(
        { version: '2', validate: { response: { 200: { body: () => schema.number() } } } },
        async (ctx, req, res) => res.ok({ body: 'v2' })
      );
    await server.start();

    await expect(
      supertest
        .get('/my-internal-path')
        .unset('Elastic-Api-Version')
        .expect(200)
        .then(({ text }) => text)
    ).resolves.toMatch('v1');
  });

  it('requires version headers to be set for internal and public endpoints when in dev', async () => {
    await setupServer({ dev: true });
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
      .addVersion({ version: '2023-10-31', validate: false }, async (ctx, req, res) => res.ok());

    router.versioned
      .get({
        path: '/my-internal-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion({ version: '1', validate: false }, async (ctx, req, res) => res.ok());

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .unset('Elastic-Api-Version')
        .expect(400)
        .then(({ body }) => body.message)
    ).resolves.toMatch(/Please specify.+version/);

    await supertest.get('/my-path').set('Elastic-Api-Version', '2023-10-31').expect(200);

    await expect(
      supertest
        .get('/my-internal-path')
        .unset('Elastic-Api-Version')
        .expect(400)
        .then(({ body }) => body.message)
    ).resolves.toMatch(/Please specify.+version/);

    await supertest.get('/my-internal-path').set('Elastic-Api-Version', '1').expect(200);
  });

  it('errors when no handler could be found', async () => {
    router.versioned.get({
      path: '/my-path',
      security: { authz: { enabled: false, reason: '' } },
      access: 'public',
    });

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .set('Elastic-Api-Version', '2020-02-02')
        .expect(500)
        .then(({ body }) => body)
    ).resolves.toMatchObject({ message: expect.stringMatching(/No handlers registered/) });
    expect(captureErrorMock).not.toHaveBeenCalled();
  });

  it('resolves the newest handler on serverless', async () => {
    await setupServer({ serverless: true, dev: false });

    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
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
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
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

  it('captures the error if handler throws', async () => {
    const error = new Error(`some error`);

    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        throw error;
      });

    await server.start();

    await supertest.get('/my-path').set('Elastic-Api-Version', '1').expect(500);

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(error);
  });

  it('reserves the query parameter "apiVersion" for version negotiation', async () => {
    await setupServer({ serverless: false, dev: false });
    router.versioned
      .get({
        path: '/my-path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'public',
      })
      .addVersion(
        {
          validate: {
            request: {
              query: schema.object({ [ELASTIC_HTTP_VERSION_QUERY_PARAM]: schema.string() }),
            },
          },
          version: '2023-04-04',
        },
        async (ctx, req, res) => {
          return res.ok({ body: 'ok' });
        }
      );

    await server.start();

    await expect(
      supertest
        .get('/my-path')
        .query({ [ELASTIC_HTTP_VERSION_QUERY_PARAM]: '2023-04-04' })
        .expect(400)
        .then(({ body }) => body.message)
    ).resolves.toEqual(
      'Use of query parameter "apiVersion" is not allowed. Please specify the API version using the "elastic-api-version" header.'
    );
  });

  describe('query parameter version negotiation', () => {
    let publicHandler: jest.Mock;
    let internalHandler: jest.Mock;
    beforeEach(() => {
      publicHandler = jest.fn(async (ctx: any, req: any, res: any) => {
        return res.ok({ body: 'ok' });
      });
      internalHandler = jest.fn(async (ctx: any, req: any, res: any) => {
        return res.ok({ body: 'ok' });
      });
      router.versioned
        .get({
          path: '/my-public',
          security: { authz: { enabled: false, reason: '' } },
          access: 'public',
          enableQueryVersion: true,
        })
        .addVersion(
          {
            validate: { request: { query: schema.object({ a: schema.number() }) } },
            version: '2023-10-31',
          },
          publicHandler
        );

      router.versioned
        .get({
          path: '/my-internal',
          security: { authz: { enabled: false, reason: '' } },
          access: 'internal',
          enableQueryVersion: true,
        })
        .addVersion(
          {
            validate: { request: { query: schema.object({ a: schema.number() }) } },
            version: '1',
          },
          internalHandler
        );
    });
    it('finds version based on header', async () => {
      await server.start();
      await supertest
        .get('/my-public')
        .set('Elastic-Api-Version', '2023-10-31')
        .query({ a: 1 })
        .expect(200);
      expect(publicHandler).toHaveBeenCalledTimes(1);
      {
        const [[_, req]] = publicHandler.mock.calls;
        expect(req.query).toEqual({ a: 1 }); // does not contain apiVersion key
      }
      await supertest
        .get('/my-internal')
        .set('Elastic-Api-Version', '1')
        .query({ a: 2 })
        .expect(200);
      expect(internalHandler).toHaveBeenCalledTimes(1);
      {
        const [[_, req]] = internalHandler.mock.calls;
        expect(req.query).toEqual({ a: 2 }); // does not contain apiVersion key
      }
    });
    it('finds version based on query param', async () => {
      await server.start();
      await supertest.get('/my-public').query({ apiVersion: '2023-10-31', a: 1 }).expect(200);
      {
        const [[_, req]] = publicHandler.mock.calls;
        expect(req.query).toEqual({ a: 1 }); // does not contain apiVersion key
      }
      await supertest.get('/my-internal').query({ apiVersion: '1', a: 2 }).expect(200);
      {
        const [[_, req]] = internalHandler.mock.calls;
        expect(req.query).toEqual({ a: 2 }); // does not contain apiVersion key
      }
    });
  });

  it('defaults version parameters for select internal paths', async () => {
    await setupServer(
      {},
      { useVersionResolutionStrategyForInternalPaths: ['/my_path_to_bypass/{id?}'] }
    );

    router.versioned
      .get({
        path: '/my_path_to_bypass/{id?}',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        return res.ok({ body: { ok: true } });
      });
    router.versioned
      .get({
        path: '/my_other_path',
        security: { authz: { enabled: false, reason: '' } },
        access: 'internal',
      })
      .addVersion({ validate: false, version: '1' }, async (ctx, req, res) => {
        return res.ok({ body: { ok: true } });
      });

    await server.start();

    await supertest.get('/my_path_to_bypass/123').expect(200);
    const response = await supertest.get('/my_other_path').expect(400);

    expect(response).toMatchObject({
      status: 400,
      body: {
        message: expect.stringContaining('Please specify a version'),
      },
    });
  });
});
