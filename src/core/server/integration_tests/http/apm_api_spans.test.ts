/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { captureErrorMock } from './apm_api_spans.test.mocks';

import Supertest from 'supertest';
import apm, { type Span } from 'elastic-apm-node';
import { createTestEnv, getEnvOptions } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { createConfigService } from '@kbn/core-http-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import type { HttpConfigType, HttpService } from '@kbn/core-http-server-internal';
import type { IRouter } from '@kbn/core-http-server';
import type { CliArgs } from '@kbn/config';
import { createInternalHttpService } from '../utilities';

let server: HttpService;
let logger: ReturnType<typeof loggingSystemMock.create>;

describe('APM HTTP API spans', () => {
  let router: IRouter;
  let supertest: Supertest.Agent;
  const endMock = jest.fn();
  jest.spyOn(apm, 'startSpan').mockReturnValue({ end: endMock } as any as Span);

  const assertSpanCloseCalled = (numberofOfCalls: number = 2) => {
    expect(apm.startSpan).toHaveBeenCalledTimes(numberofOfCalls);
    expect(endMock).toHaveBeenCalledTimes(numberofOfCalls);
    endMock.mockClear();
    (apm.startSpan as jest.Mock).mockClear();
  };

  async function setupServer(cliArgs: Partial<CliArgs> = {}) {
    logger = loggingSystemMock.create();
    await server?.stop(); // stop the already started server
    const serverConfig: Partial<HttpConfigType> = {
      versioned: {
        versionResolution: cliArgs.dev ? 'none' : cliArgs.serverless ? 'newest' : 'oldest',
        strictClientVersionCheck: !cliArgs.serverless,
        useVersionResolutionStrategyForInternalPaths: [],
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
    endMock.mockClear();
    (apm.startSpan as jest.Mock).mockClear();
    await setupServer();
  });

  afterEach(async () => {
    captureErrorMock.mockReset();
    await server.stop();
  });

  describe('versioned router', () => {
    it('adds spans for successful API call', async () => {
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
          .set('Elastic-Api-Version', '1')
          .expect(200)
          .then(({ body: { v } }) => v)
      ).resolves.toBe('1');
      assertSpanCloseCalled();
    });

    it('adds spans when handler throws', async () => {
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
      assertSpanCloseCalled();

      expect(captureErrorMock).toHaveBeenCalledTimes(1);
      expect(captureErrorMock).toHaveBeenCalledWith(error);
    });
  });

  describe('unversioned router', () => {
    it('adds spans for successful API call', async () => {
      router.get(
        {
          path: '/',
          validate: false,
          options: { authRequired: 'optional' },
          security: { authz: { enabled: false, reason: '' } },
        },
        (context, req, res) => res.ok({})
      );
      await server.start();

      await supertest.get('/').expect(200);
      assertSpanCloseCalled();
    });

    it('adds spans when handler throws', async () => {
      const error = new Error(`some error`);
      router.get(
        { path: '/', security: { authz: { enabled: false, reason: '' } }, validate: false },
        (context, req, res) => {
          throw error;
        }
      );
      await server.start();

      await supertest.get('/').expect(500);
      assertSpanCloseCalled();

      expect(captureErrorMock).toHaveBeenCalledTimes(1);
      expect(captureErrorMock).toHaveBeenCalledWith(error);
    });
  });
});
