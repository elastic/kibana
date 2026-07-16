/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @jest-environment node
 */

import http from 'node:http';
import https from 'node:https';
import Supertest from 'supertest';
import nodeFetch, {
  Headers as NodeFetchHeaders,
  Request as NodeFetchRequest,
  Response as NodeFetchResponse,
} from 'node-fetch';
import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { createConfigService } from '@kbn/core-http-server-mocks';
import type {
  HttpConfigType,
  HttpService,
  InternalHttpServiceStart,
} from '@kbn/core-http-server-internal';
import { createInternalHttpService } from '../utilities';

interface DepthResponse {
  readonly depth?: string | string[];
  readonly error?: string;
}

const TEST_PORT = 10003;
const routeSecurity = {
  authz: {
    enabled: false,
    reason: 'This route is part of an HTTP integration test.',
  },
} as const;
const setupDeps = {
  context: contextServiceMock.createSetupContract(),
  executionContext: executionContextServiceMock.createInternalSetupContract(),
  userActivity: userActivityServiceMock.createInternalSetupContract(),
};
const originalFetch = global.fetch;
const originalHeaders = global.Headers;
const originalRequest = global.Request;
const originalResponse = global.Response;

const startServer = async (
  serverConfig: Partial<HttpConfigType> = { port: TEST_PORT }
): Promise<{
  server: HttpService;
  httpStart: InternalHttpServiceStart;
  supertest: Supertest.Agent;
}> => {
  const server = createInternalHttpService({
    logger: loggingSystemMock.create(),
    configService: createConfigService({
      server: serverConfig,
    }),
  });
  await server.preboot({
    context: contextServiceMock.createPrebootContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
  });

  const { server: innerServer, createRouter } = await server.setup(setupDeps);
  const router = createRouter('/');
  const supertest = Supertest(innerServer.listener);
  const started = { httpStart: null as InternalHttpServiceStart | null };

  router.get(
    {
      path: '/self/path_safety',
      security: routeSecurity,
      validate: false,
    },
    async (context, req, res) => {
      try {
        await started.httpStart!.selfClient.asScoped(req).fetch('/\\evil.com/steal');
      } catch (error) {
        return res.ok({ body: { error: (error as Error).message } });
      }

      return res.ok({ body: { error: null } });
    }
  );

  router.get(
    {
      path: '/self/depth/{remaining}',
      security: routeSecurity,
      validate: {
        params: schema.object({
          remaining: schema.number({ min: 0 }),
        }),
      },
    },
    async (context, req, res) => {
      if (req.params.remaining === 0) {
        return res.ok({
          body: { depth: req.headers['x-kbn-self-call-depth'] },
        });
      }

      try {
        const body = await started
          .httpStart!.selfClient.asScoped(req)
          .fetch<DepthResponse>(`/self/depth/${req.params.remaining - 1}`);

        return res.ok({ body });
      } catch (error) {
        return res.ok({ body: { error: (error as Error).message } });
      }
    }
  );

  router.get(
    {
      path: '/self/target_url',
      security: routeSecurity,
      validate: false,
    },
    (_context, req, res) => {
      return res.ok({
        body: {
          url: req.url.href,
          host: req.headers.host,
        },
      });
    }
  );

  router.get(
    {
      path: '/self/resolve_target',
      security: routeSecurity,
      validate: false,
    },
    async (context, req, res) => {
      try {
        const response = await started
          .httpStart!.selfClient.asScoped(req)
          .fetch<{ url: string; host?: string }>('/self/target_url', { asResponse: true });

        return res.ok({
          body: {
            url: response.request.url,
          },
        });
      } catch (error) {
        return res.ok({ body: { error: (error as Error).message } });
      }
    }
  );

  started.httpStart = await server.start();

  return { server, httpStart: started.httpStart, supertest };
};

describe('Http self client', () => {
  beforeAll(() => {
    global.fetch = nodeFetch as unknown as typeof global.fetch;
    global.Headers = NodeFetchHeaders as unknown as typeof global.Headers;
    global.Request = NodeFetchRequest as unknown as typeof global.Request;
    global.Response = NodeFetchResponse as unknown as typeof global.Response;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.Headers = originalHeaders;
    global.Request = originalRequest;
    global.Response = originalResponse;
  });

  describe('path safety and depth limits', () => {
    let server: HttpService;
    let supertest: Supertest.Agent;

    beforeEach(async () => {
      ({ server, supertest } = await startServer());
    });

    afterEach(async () => {
      await server.stop();
      http.globalAgent.destroy();
      https.globalAgent.destroy();
    });

    it('rejects authority-like backslash paths before making a self call', async () => {
      const response = await supertest.get('/self/path_safety').expect(200);

      expect(response.body.error).toContain('Invalid self HTTP path "/\\evil.com/steal"');
    });

    it('increments self-call depth across recursive self requests', async () => {
      const response = await supertest.get('/self/depth/3').expect(200);

      expect(response.body).toEqual({ depth: '3' });
    });

    it('rejects recursive self requests after the depth limit is reached', async () => {
      const response = await supertest.get('/self/depth/5').expect(200);

      expect(response.body.error).toContain('maximum depth 4 was reached');
    });
  });

  describe('selfHttp target resolution', () => {
    let server: HttpService;
    let supertest: Supertest.Agent;

    afterEach(async () => {
      await server.stop();
      http.globalAgent.destroy();
      https.globalAgent.destroy();
    });

    it('uses publicBaseUrl when target is auto and publicBaseUrl is configured', async () => {
      ({ server, supertest } = await startServer({
        port: TEST_PORT,
        publicBaseUrl: `http://localhost:${TEST_PORT}`,
        selfHttp: { target: 'auto' },
      }));

      const response = await supertest.get('/self/resolve_target').expect(200);

      expect(response.body.url).toBe(`http://localhost:${TEST_PORT}/self/target_url`);
    });

    it('uses local server info when target is auto and publicBaseUrl is absent', async () => {
      ({ server, supertest } = await startServer({
        port: TEST_PORT,
        selfHttp: { target: 'auto' },
      }));

      const response = await supertest.get('/self/resolve_target').expect(200);

      expect(response.body.url).toBe(`http://localhost:${TEST_PORT}/self/target_url`);
    });

    it('ignores publicBaseUrl when target is local', async () => {
      ({ server, supertest } = await startServer({
        port: TEST_PORT,
        publicBaseUrl: 'http://external.example',
        selfHttp: { target: 'local' },
      }));

      const response = await supertest.get('/self/resolve_target').expect(200);

      expect(response.body.url).toBe(`http://localhost:${TEST_PORT}/self/target_url`);
    });
  });
});
