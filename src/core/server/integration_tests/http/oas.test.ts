/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { createConfigService, createHttpService } from '@kbn/core-http-server-mocks';
import type {
  InternalContextPreboot,
  InternalContextSetup,
} from '@kbn/core-http-context-server-internal';
import { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import { IRouter } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';

let prebootDeps: {
  context: jest.Mocked<InternalContextPreboot>;
};
let setupDeps: {
  context: jest.Mocked<InternalContextSetup>;
  executionContext: jest.Mocked<InternalExecutionContextSetup>;
};
beforeEach(async () => {
  prebootDeps = {
    context: contextServiceMock.createPrebootContract(),
  };
  const contextSetup = contextServiceMock.createSetupContract();
  setupDeps = {
    context: contextSetup,
    executionContext: executionContextServiceMock.createInternalSetupContract(),
  };
});

let httpService: ReturnType<typeof createHttpService>;
type ConfigServiceArgs = Parameters<typeof createConfigService>[0];
async function startService(
  args: {
    config?: ConfigServiceArgs;
    createRoutes?: (getRouter: (pluginId?: symbol) => IRouter) => void;
  } = {}
) {
  httpService = createHttpService({
    configService: createConfigService(args.config),
  });
  await httpService.preboot(prebootDeps);
  const { server: innerServer, createRouter } = await httpService.setup(setupDeps);
  if (args.createRoutes) {
    args.createRoutes((pluginId) => createRouter('/', pluginId));
  }
  await httpService.start();
  return {
    listener: innerServer.listener,
  };
}

async function stopService() {
  await httpService?.stop();
}

afterEach(async () => {
  await stopService();
});

it('is disabled by default', async () => {
  const server = await startService();
  await supertest(server.listener).get('/api/oas').expect(404);
});

it('handles requests when enabled', async () => {
  const server = await startService({
    config: { server: { oas: { enabled: true }, restrictInternalApis: false } },
  });
  const result = await supertest(server.listener).get('/api/oas');
  expect(result.status).toBe(200);
});

it.each([
  {
    queryParam: { pathStartsWith: '/api/public-test' },
    includes: {
      paths: {
        '/api/public-test': {
          get: {},
          post: {},
        },
        '/api/public-test/{id}': {},
      },
    },
    excludes: ['/my-other-plugin'],
  },
  {
    queryParam: { pluginId: 'myPlugin' },
    includes: {
      paths: {
        '/api/public-test': {
          get: {},
          post: {},
        },
        '/api/public-test/{id}': {},
      },
    },
    excludes: ['/my-other-plugin'],
  },
  {
    queryParam: { pluginId: 'nonExistant' },
    includes: {},
    excludes: ['/my-public-test', '/my-other-plugin'],
  },
  {
    queryParam: {
      pluginId: 'myOtherPlugin',
      access: 'internal',
      pathStartsWith: ['/api/my-other-plugin'],
    },
    includes: {
      paths: {
        '/api/my-other-plugin': {
          get: {},
          post: {},
          put: {},
        },
      },
    },
    excludes: ['/my-public-test'],
  },
  {
    queryParam: { access: 'public', version: '2023-10-31' },
    includes: {
      paths: {
        '/api/public-test': {
          get: {},
        },
        '/api/versioned': {
          get: {},
        },
      },
    },
    excludes: ['/api/my-public-test/{id}', '/api/my-other-plugin'],
  },
  {
    queryParam: { excludePathsMatching: ['/api/internal-test', '/api/my-other-plugin'] },
    includes: {
      paths: {
        '/api/public-test': {
          get: {},
        },
        '/api/versioned': {
          get: {},
        },
      },
    },
    excludes: ['/api/internal-test', '/api/my-other-plugin'],
  },
  {
    queryParam: { access: 'internal', pathStartsWith: ['/api/versioned-internal'] },
    includes: {
      paths: {
        '/api/versioned-internal': {
          get: {
            parameters: [
              {
                description: 'The version of the API to use',
                in: 'header',
                name: 'elastic-api-version',
                schema: {
                  default: '2',
                  enum: ['1', '2'],
                  type: 'string',
                },
              },
            ],
            requestBody: {
              content: {
                'application/json; Elastic-Api-Version=1': {}, // Multiple body types
                'application/json; Elastic-Api-Version=2': {},
              },
            },
          },
        },
      },
    },
    excludes: ['/api/internal-test', '/api/my-other-plugin'],
  },
])(
  'can filter paths based on query params $queryParam',
  async ({ queryParam, includes, excludes }) => {
    const server = await startService({
      config: { server: { oas: { enabled: true }, restrictInternalApis: false } },
      createRoutes: (getRouter) => {
        const router1 = getRouter(Symbol('myPlugin'));
        router1.get(
          { path: '/api/public-test', validate: false, options: { access: 'public' } },
          (_, __, res) => res.ok()
        );
        router1.post(
          { path: '/api/public-test', validate: false, options: { access: 'public' } },
          (_, __, res) => res.ok()
        );
        router1.get(
          { path: '/api/public-test/{id}', validate: false, options: { access: 'public' } },
          (_, __, res) => res.ok()
        );
        router1.get(
          {
            path: '/api/internal-test',
            validate: false,
            options: {
              /* empty */
            },
          },
          (_, __, res) => res.ok()
        );

        router1.versioned
          .get({ path: '/api/versioned', access: 'public' })
          .addVersion({ version: '2023-10-31', validate: false }, (_, __, res) => res.ok());

        router1.versioned
          .get({ path: '/api/versioned-internal', access: 'internal' })
          .addVersion(
            {
              version: '1',
              validate: { request: { body: schema.object({ foo: schema.string() }) } },
            },
            (_, __, res) => res.ok()
          )
          .addVersion(
            {
              version: '2',
              validate: { request: { body: schema.object({ bar: schema.string() }) } },
            },
            (_, __, res) => res.ok()
          );

        const router2 = getRouter(Symbol('myOtherPlugin'));
        router2.get({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
        router2.post({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
        router2.put({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
      },
    });
    const result = await supertest(server.listener).get('/api/oas').query(queryParam);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject(includes);
    excludes.forEach((exclude) => {
      expect(result.body.paths).not.toHaveProperty(exclude);
    });
  }
);

it('only accepts "public" or "internal" for "access" query param', async () => {
  const server = await startService({ config: { server: { oas: { enabled: true } } } });
  const result = await supertest(server.listener).get('/api/oas').query({ access: 'invalid' });
  expect(result.body.message).toBe(
    `[access]: types that failed validation:
- [access.0]: expected value to equal [public]
- [access.1]: expected value to equal [internal]`
  );
  expect(result.status).toBe(400);
});
