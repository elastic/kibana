/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { createConfigService } from '@kbn/core-http-server-mocks';

import { createInternalHttpService } from '../utilities';

const setupDeps = {
  context: contextServiceMock.createSetupContract(),
  executionContext: executionContextServiceMock.createInternalSetupContract(),
  userActivity: userActivityServiceMock.createInternalSetupContract(),
};

let server: ReturnType<typeof createInternalHttpService>;

const start = async (configOverrides: { basePath?: string; rewriteBasePath?: boolean } = {}) => {
  const logger = loggingSystemMock.create();
  server = createInternalHttpService({
    logger,
    configService: createConfigService({ server: configOverrides }),
  });
  await server.preboot({
    context: contextServiceMock.createPrebootContract(),
    docLinks: docLinksServiceMock.createSetupContract(),
  });
  return server.setup(setupDeps);
};

afterEach(async () => {
  await server.stop();
});

describe('space id extraction in onRequest', () => {
  it('populates request.spaceId and rewrites the URL for /s/<id>/... paths', async () => {
    const { server: innerServer, createRouter } = await start();
    const router = createRouter('/');

    router.get(
      {
        path: '/api/echo',
        validate: false,
        security: { authz: { enabled: false, reason: 'integration test' } },
      },
      (_context, req, res) => {
        const rawRequest = ensureRawRequest(req);
        return res.ok({
          body: {
            spaceId: req.spaceId,
            url: req.url.pathname,
            rewrittenUrl: (rawRequest.app as any).rewrittenUrl?.pathname,
          },
        });
      }
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/s/myspace/api/echo').expect(200);

    expect(response.body).toEqual({
      spaceId: 'myspace',
      url: '/api/echo',
      rewrittenUrl: '/s/myspace/api/echo',
    });
  });

  it('defaults spaceId to "default" and does not rewrite the URL when no /s/ prefix is present', async () => {
    const { server: innerServer, createRouter } = await start();
    const router = createRouter('/');

    router.get(
      {
        path: '/api/echo',
        validate: false,
        security: { authz: { enabled: false, reason: 'integration test' } },
      },
      (_context, req, res) => {
        const rawRequest = ensureRawRequest(req);
        return res.ok({
          body: {
            spaceId: req.spaceId,
            url: req.url.pathname,
            rewrittenUrl: (rawRequest.app as any).rewrittenUrl?.pathname ?? null,
          },
        });
      }
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/api/echo').expect(200);

    expect(response.body).toEqual({
      spaceId: 'default',
      url: '/api/echo',
      rewrittenUrl: null,
    });
  });

  it('extracts the spaceId after a server basePath when rewriteBasePath is true', async () => {
    const { server: innerServer, createRouter } = await start({
      basePath: '/kibana',
      rewriteBasePath: true,
    });
    const router = createRouter('/');

    router.get(
      {
        path: '/api/echo',
        validate: false,
        security: { authz: { enabled: false, reason: 'integration test' } },
      },
      (_context, req, res) => {
        return res.ok({
          body: {
            spaceId: req.spaceId,
            url: req.url.pathname,
            rewrittenUrl: req.rewrittenUrl?.pathname ?? null,
          },
        });
      }
    );

    await server.start();

    const response = await supertest(innerServer.listener)
      .get('/kibana/s/myspace/api/echo')
      .expect(200);

    expect(response.body).toEqual({
      spaceId: 'myspace',
      url: '/api/echo',
      // rewrittenUrl preserves the full pre-strip URL (with both config.basePath and /s/<id>)
      // so audit/observability consumers see the original URL.
      rewrittenUrl: '/kibana/s/myspace/api/echo',
    });
  });

  it('does not match /s/<id>/ in the middle of the path', async () => {
    const { server: innerServer, createRouter } = await start();
    const router = createRouter('/');

    router.get(
      {
        path: '/api/foo/s/middle/bar',
        validate: false,
        security: { authz: { enabled: false, reason: 'integration test' } },
      },
      (_context, req, res) => {
        return res.ok({ body: { spaceId: req.spaceId, url: req.url.pathname } });
      }
    );

    await server.start();

    const response = await supertest(innerServer.listener).get('/api/foo/s/middle/bar').expect(200);

    expect(response.body).toEqual({ spaceId: 'default', url: '/api/foo/s/middle/bar' });
  });
});
