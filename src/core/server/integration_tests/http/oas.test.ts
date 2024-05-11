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
import { createConfigService, createHttpService } from '@kbn/core-http-server-mocks';
import type {
  InternalContextPreboot,
  InternalContextSetup,
} from '@kbn/core-http-context-server-internal';
import { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import { IRouter } from '@kbn/core-http-server';

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
  const server = await startService({ config: { server: { oas: { enabled: true } } } });
  const result = await supertest(server.listener).get('/api/oas');
  expect(result.status).toBe(200);
});

it.each([
  {
    queryParam: { pathStartsWith: '/api/include-test' },
    includes: {
      paths: {
        '/api/include-test': {
          get: {},
          post: {},
        },
        '/api/include-test/{id}': {},
      },
    },
    excludes: {
      paths: {
        '/my-other-plugin': {},
      },
    },
  },
  {
    queryParam: { pluginId: 'myPlugin' },
    includes: {
      paths: {
        '/api/include-test': {
          get: {},
          post: {},
        },
        '/api/include-test/{id}': {},
      },
    },
    excludes: {
      paths: {
        '/my-other-plugin': {},
      },
    },
  },
  {
    queryParam: { pluginId: 'nonExistant' },
    includes: {},
    excludes: {
      paths: {
        '/my-include-test': {},
        '/my-other-plugin': {},
      },
    },
  },
  {
    queryParam: { pluginId: 'myOtherPlugin', pathStartsWith: '/api/my-other-plugin' },
    includes: {
      paths: {
        '/api/my-other-plugin': {
          get: {},
          post: {},
          put: {},
        },
      },
    },
    excludes: {
      paths: {
        '/my-include-test': {},
      },
    },
  },
])(
  'can filter paths based on query params $queryParam',
  async ({ queryParam, includes, excludes }) => {
    const server = await startService({
      config: { server: { oas: { enabled: true } } },
      createRoutes: (getRouter) => {
        const router1 = getRouter(Symbol('myPlugin'));
        router1.get({ path: '/api/include-test', validate: false }, (_, __, res) => res.ok());
        router1.post({ path: '/api/include-test', validate: false }, (_, __, res) => res.ok());
        router1.get({ path: '/api/include-test/{id}', validate: false }, (_, __, res) => res.ok());
        router1.get({ path: '/api/exclude-test', validate: false }, (_, __, res) => res.ok());

        const router2 = getRouter(Symbol('myOtherPlugin'));
        router2.get({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
        router2.post({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
        router2.put({ path: '/api/my-other-plugin', validate: false }, (_, __, res) => res.ok());
      },
    });
    const result = await supertest(server.listener).get('/api/oas').query(queryParam);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject(includes);
    expect(result.body).not.toMatchObject(excludes);
  }
);
