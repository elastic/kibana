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
import type { HttpService, InternalHttpServiceStart } from '@kbn/core-http-server-internal';
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

describe('Http self client', () => {
  let server: HttpService;
  let httpStart: InternalHttpServiceStart;
  let supertest: Supertest.Agent;

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

  beforeEach(async () => {
    server = createInternalHttpService({
      logger: loggingSystemMock.create(),
      configService: createConfigService({
        server: { port: TEST_PORT },
      }),
    });
    await server.preboot({
      context: contextServiceMock.createPrebootContract(),
      docLinks: docLinksServiceMock.createSetupContract(),
    });

    const { server: innerServer, createRouter } = await server.setup(setupDeps);
    const router = createRouter('/');
    supertest = Supertest(innerServer.listener);

    router.get(
      {
        path: '/self/path_safety',
        security: routeSecurity,
        validate: false,
      },
      async (context, req, res) => {
        try {
          await httpStart.self.asScoped(req).fetch('/\\evil.com/steal');
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
          const body = await httpStart.self
            .asScoped(req)
            .fetch<DepthResponse>(`/self/depth/${req.params.remaining - 1}`);

          return res.ok({ body });
        } catch (error) {
          return res.ok({ body: { error: (error as Error).message } });
        }
      }
    );

    httpStart = await server.start();
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
