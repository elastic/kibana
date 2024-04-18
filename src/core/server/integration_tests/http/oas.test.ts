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
  args: { config?: ConfigServiceArgs; createRoutes?: (router: IRouter) => void } = {}
) {
  httpService = createHttpService({
    configService: createConfigService(args.config),
  });
  await httpService.preboot(prebootDeps);
  const { server: innerServer, createRouter } = await httpService.setup(setupDeps);
  if (args.createRoutes) {
    args.createRoutes(createRouter('/'));
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
  supertest(server.listener).get('/api/oas').expect(404);
});

it('handles requests when enabled', async () => {
  const server = await startService({ config: { server: { oas: { enabled: true } } } });
  const result = await supertest(server.listener).get('/api/oas');
  expect(result.status).toBe(200);
});

it('can filter paths based on "pathStartsWith" query parameter', async () => {
  const server = await startService({
    config: { server: { oas: { enabled: true } } },
    createRoutes: (router) => {
      router.get({ path: '/api/include-test', validate: false }, (context, req, res) => res.ok());
      router.post({ path: '/api/include-test', validate: false }, (context, req, res) => res.ok());
      router.get({ path: '/api/include-test/{id}', validate: false }, (context, req, res) =>
        res.ok()
      );
      router.get({ path: '/api/exclude-test', validate: false }, (context, req, res) => res.ok());
    },
  });
  const result = await supertest(server.listener)
    .get('/api/oas')
    .query({ pathStartsWith: '/api/include-test' });
  expect(result.status).toBe(200);
  expect(result.body.paths['/api/exclude-test']).toBeUndefined();
  expect(result.body.paths['/api/include-test']).not.toBeUndefined();
  expect(result.body).toMatchObject({
    paths: {
      '/api/include-test': {
        get: {},
        post: {},
      },
      '/api/include-test/{id}': {},
    },
  });
});
