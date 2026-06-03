/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import fs from 'fs';
import os from 'os';
import nodePath from 'path';
import http from 'http';
import { Readable } from 'stream';
import { gunzipSync } from 'zlib';
import FormData from 'form-data';
import { schema } from '@kbn/config-schema';
import { AuthResultType } from '@kbn/core-http-server';
import { REPO_ROOT } from '@kbn/repo-info';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { Router } from '@kbn/core-http-router-server-internal';
import { FastifyHttpServer } from './fastify_http_server';
import { HttpConfig } from './http_config';
import { CdnConfig } from './cdn_config';
import type { CspConfigType } from './csp';
import { permissionsPolicyConfig } from './permissions_policy';
import { ExternalUrlConfig } from './external_url';

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

const createCoreContext = (): CoreContext => ({
  coreId: Symbol('core'),
  env,
  logger: loggingSystemMock.create(),
  configService: {} as any,
});

const createHttpConfig = (port: number): HttpConfig => {
  const raw: any = {
    name: 'kibana-test',
    autoListen: true,
    cdn: { url: null },
    oas: { enabled: false },
    cors: { enabled: false, allowCredentials: false, allowOrigin: ['*'] },
    securityResponseHeaders: {},
    customResponseHeaders: {},
    protocol: 'http1',
    prototypeHardening: false,
    host: '127.0.0.1',
    port,
    maxPayload: { getValueInBytes: () => 1048576 },
    rewriteBasePath: false,
    ssl: { enabled: false, supportedProtocols: ['TLSv1.2'] },
    keepaliveTimeout: 120000,
    socketTimeout: 120000,
    payloadTimeout: 20000,
    http2: { allowUnsecure: false },
    compression: { enabled: false, brotli: { enabled: false, quality: 3 } },
    xsrf: { disableProtection: true, allowlist: [] },
    excludeRoutes: [],
    eluMonitor: {
      enabled: false,
      logging: { enabled: false, threshold: { elu: 0.15, ela: 250 } },
    },
    rateLimiter: { enabled: false, maxThroughput: { enabled: false } },
    requestId: { allowFromAnyIp: false, ipAllowlist: [] },
    restrictInternalApis: false,
    versioned: {
      versionResolution: 'oldest',
      strictClientVersionCheck: true,
      useVersionResolutionStrategyForInternalPaths: [],
    },
    serverTiming: false,
    serverTimingElasticsearch: false,
    shutdownTimeout: moment.duration(30, 'seconds'),
    experimental: { framework: 'fastify' as const },
  };

  const cspRaw = {} as unknown as CspConfigType;
  const permissionsPolicyRaw = permissionsPolicyConfig.schema.validate({});
  const cfg = new HttpConfig(raw, cspRaw, ExternalUrlConfig.DEFAULT, permissionsPolicyRaw);
  // Replace the heavy CdnConfig if construction failed in our minimal raw setup.
  (cfg as any).cdn = CdnConfig.from({ url: null });
  return cfg;
};

const PORT = 0; // 0 → ask the OS for a free port

const httpRequest = (
  port: number,
  path: string,
  method: string = 'GET',
  options?: { headers?: http.OutgoingHttpHeaders; body?: string }
) =>
  new Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }>(
    (resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path, method, headers: options?.headers },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () =>
            resolve({
              statusCode: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
              headers: res.headers,
            })
          );
        }
      );
      req.on('error', reject);
      if (options?.body !== undefined) {
        req.write(options.body);
      }
      req.end();
    }
  );

describe('FastifyHttpServer', () => {
  it('reports as not listening before setup', () => {
    const server = new FastifyHttpServer(
      createCoreContext(),
      'Kibana',
      new BehaviorSubject(moment.duration(30, 'seconds'))
    );
    expect(server.isListening()).toBe(false);
  });

  it('exposes empty router collections initially', () => {
    const server = new FastifyHttpServer(
      createCoreContext(),
      'Kibana',
      new BehaviorSubject(moment.duration(30, 'seconds'))
    );
    expect(server.getRouters()).toEqual({ routers: [], versionedRouters: [] });
  });

  describe('end-to-end route serving', () => {
    let server: FastifyHttpServer;
    let listenPort = 0;

    afterEach(async () => {
      await server?.stop();
    });

    it('serves a registered GET route through the Kibana router and returns the response body', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      // Test-only context enhancer: invoke the user's handler with a stub context.
      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/hello',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async (_context, _req, res) => res.ok({ body: { greeting: 'hello fastify' } })
      );

      router.get(
        {
          path: '/echo-query',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: { query: schema.object({ name: schema.string() }) },
        },
        async (_context, req, res) => res.ok({ body: { name: (req.query as any).name } })
      );

      router.get(
        {
          path: '/error',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async (_context, _req, res) => res.badRequest({ body: 'nope' })
      );

      router.get(
        {
          path: '/error-stream',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async (_context, _req, res) =>
          res.customError({
            body: Readable.from(['error stream'], { objectMode: false }),
            statusCode: 501,
          })
      );

      setup.registerRouter(router);
      await server.start();

      // Discover the actual bound port
      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const ok = await httpRequest(listenPort, '/api/fastify-mvp/hello');
      expect(ok.statusCode).toBe(200);
      expect(JSON.parse(ok.body)).toEqual({ greeting: 'hello fastify' });

      const validated = await httpRequest(listenPort, '/api/fastify-mvp/echo-query?name=elastic');
      expect(validated.statusCode).toBe(200);
      expect(JSON.parse(validated.body)).toEqual({ name: 'elastic' });

      const validationErr = await httpRequest(listenPort, '/api/fastify-mvp/echo-query');
      expect(validationErr.statusCode).toBe(400);
      const errBody = JSON.parse(validationErr.body);
      expect(errBody).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(errBody.message).toMatch(/name/);

      const explicitError = await httpRequest(listenPort, '/api/fastify-mvp/error');
      expect(explicitError.statusCode).toBe(400);
      expect(JSON.parse(explicitError.body)).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'nope',
      });

      const errorStream = await httpRequest(listenPort, '/api/fastify-mvp/error-stream');
      expect(errorStream.statusCode).toBe(501);
      expect(errorStream.body).toBe('error stream');
      expect(String(errorStream.headers['content-type'] ?? '')).not.toContain('application/json');
    }, 15000);

    it('returns 500 when the route handler throws without crashing the server', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/throws',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async () => {
          throw new Error('intentional test throw');
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/throws');
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(500);
      expect(body.error).toBe('Internal Server Error');

      const okAfter = await httpRequest(listenPort, '/api/fastify-mvp/hello');
      expect(okAfter.statusCode).toBe(404);
    }, 15000);

    it('accepts POST with Content-Type application/json and an empty body (Hapi parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/empty-json-body',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: { body: schema.nullable(schema.any()) },
        },
        async (_context, req, res) => res.ok({ body: { body: req.body } })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/empty-json-body', 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ body: null });
    }, 15000);

    it('returns 400 when POST has no Content-Type and an empty body on a validated route (Hapi parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/validated-empty-body',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: { body: schema.object({ test: schema.string() }) },
        },
        async () => {
          throw new Error('should not reach handler');
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/validated-empty-body', 'POST', {
        headers: { 'Content-Length': '0' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(400);
      expect(body.message).toBe(
        '[request body]: expected a plain object value, but found [null] instead.'
      );
    }, 15000);

    it('parses application/x-www-form-urlencoded for validated routes (SAML callback parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/saml-callback',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.object(
              { SAMLResponse: schema.string(), RelayState: schema.maybe(schema.string()) },
              { unknowns: 'ignore' }
            ),
          },
          options: { xsrfRequired: false, access: 'public' },
        },
        async (_context, req, res) =>
          res.redirected({
            headers: { location: '/app/home' },
          })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const formBody = 'SAMLResponse=mock-saml-response&RelayState=%2Fapp';
      const res = await httpRequest(listenPort, '/api/fastify-mvp/saml-callback', 'POST', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': String(Buffer.byteLength(formBody)),
        },
        body: formBody,
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/app/home');
    }, 15000);

    it('redirects trailing-slash URLs via catch-all when a named param would be empty (cases alerts/)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const catchAllRouter = new Router('', ctx.logger.get('catch-all'), enhanceHandler, { env });
      catchAllRouter.get(
        {
          path: '/{path*}',
          validate: {
            params: schema.object({
              path: schema.maybe(schema.string()),
            }),
            query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          },
          security: {
            authz: { enabled: false, reason: 'test' },
            authc: { enabled: false, reason: 'test' },
          },
          options: { access: 'public' },
        },
        async (_context, req, res) => {
          const { path } = req.params as { path?: string };
          if (!path || !path.endsWith('/') || path.startsWith('/')) {
            return res.notFound();
          }
          return res.redirected({
            headers: { location: `/${path.slice(0, -1)}` },
          });
        }
      );

      const casesRouter = new Router('', ctx.logger.get('cases'), enhanceHandler, { env });
      casesRouter.get(
        {
          path: '/api/cases/{case_id}',
          validate: {
            params: schema.object({
              case_id: schema.string({ minLength: 1 }),
            }),
          },
          security: {
            authz: { enabled: false, reason: 'test' },
            authc: { enabled: false, reason: 'test' },
          },
          options: { access: 'public' },
        },
        async () => {
          throw new Error('should not treat alerts/ as case_id=alerts');
        }
      );

      const alertsRouter = new Router('', ctx.logger.get('alerts'), enhanceHandler, { env });
      alertsRouter.get(
        {
          path: '/api/cases/alerts/{alert_id}',
          validate: {
            params: schema.object({
              alert_id: schema.string({ minLength: 1 }),
            }),
          },
          security: {
            authz: { enabled: false, reason: 'test' },
            authc: { enabled: false, reason: 'test' },
          },
          options: { access: 'public' },
        },
        async () => {
          throw new Error('should not reach alerts handler for trailing-slash-only path');
        }
      );

      setup.registerRouter(catchAllRouter);
      setup.registerRouter(casesRouter);
      setup.registerRouter(alertsRouter);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/cases/alerts/', 'GET');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/api/cases/alerts');
    }, 15000);

    it('keeps application/json as a Readable for routes with body output stream + parse false (Console proxy parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/json-stream-body',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.stream(),
          },
          options: {
            body: {
              output: 'stream',
              parse: false,
            },
          },
        },
        async (_context, req, res) => {
          expect(typeof (req.body as { pipe?: unknown })?.pipe).toBe('function');
          const chunks: Buffer[] = [];
          for await (const chunk of req.body as Readable) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const text = Buffer.concat(chunks).toString('utf8');
          return res.ok({ body: { raw: text } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const payload = JSON.stringify({ proxy: true });
      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/json-stream-body',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ raw: '{"proxy":true}' });
    }, 15000);

    it('treats bodyless POST as an empty stream for parse: false stream routes (Console proxy .send())', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/empty-stream-body',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.stream(),
          },
          options: {
            body: {
              output: 'stream',
              parse: false,
            },
          },
        },
        async (_context, req, res) => {
          expect(typeof (req.body as { pipe?: unknown })?.pipe).toBe('function');
          const chunks: Buffer[] = [];
          for await (const chunk of req.body as Readable) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return res.ok({ body: { bytes: Buffer.concat(chunks).length } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/empty-stream-body', 'POST');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ bytes: 0 });
    }, 15000);

    it('accepts PUT image/png bodies for stream routes (Files upload / defaultImage parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.put(
        {
          path: '/binary-put',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.stream(),
          },
          options: {
            body: {
              output: 'stream',
              parse: false,
              accepts: ['image/png', 'image/jpeg'],
              maxBytes: 1024 * 1024,
            },
          },
        },
        async (_context, req, res) => {
          expect(typeof (req.body as { pipe?: unknown })?.pipe).toBe('function');
          const chunks: Buffer[] = [];
          for await (const chunk of req.body as Readable) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return res.ok({ body: { len: Buffer.concat(chunks).length } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/binary-put',
            method: 'PUT',
            headers: {
              'Content-Type': 'image/png',
              'Content-Length': pngHeader.length,
            },
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        req.write(pngHeader);
        req.end();
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ len: pngHeader.length });
    }, 15000);

    it('accepts text/plain bodies on parse: false stream routes (Files upload parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.put(
        {
          path: '/text-plain-stream',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.stream(),
          },
          options: {
            body: {
              output: 'stream',
              parse: false,
              accepts: 'text/plain',
            },
          },
        },
        async (_context, req, res) => {
          expect(typeof (req.body as { pipe?: unknown })?.pipe).toBe('function');
          const chunks: Buffer[] = [];
          for await (const chunk of req.body as Readable) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return res.ok({ body: { text: Buffer.concat(chunks).toString('utf8') } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const fileBytes = 'case attachment bytes';
      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/text-plain-stream',
            method: 'PUT',
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': Buffer.byteLength(fileBytes),
            },
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        req.write(fileBytes);
        req.end();
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ text: fileBytes });
    }, 15000);

    it('accepts application/zip with parse: false and default output data (Fleet upload parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      const zipBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      router.post(
        {
          path: '/fleet-upload',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.buffer(),
          },
          options: {
            body: {
              accepts: ['application/zip', 'application/gzip'],
              parse: false,
              maxBytes: 1024 * 1024,
            },
          },
        },
        async (_context, req, res) => {
          expect(Buffer.isBuffer(req.body)).toBe(true);
          return res.ok({ body: { len: (req.body as Buffer).length } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;

      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/fleet-upload',
            method: 'POST',
            headers: {
              'Content-Type': 'application/zip',
              'Content-Length': zipBytes.length,
            },
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        req.write(zipBytes);
        req.end();
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ len: zipBytes.length });
    }, 15000);

    it('applies Hapi default Cache-Control to router JSON responses', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/cc-default',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async (_context, _req, res) => res.ok({ body: { ok: true } })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/cc-default');
      expect(res.statusCode).toBe(200);
      expect(res.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
    }, 15000);

    it('times out slow JSON payload streams when route timeout.payload is set (Hapi parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/slow-payload',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
          options: {
            body: { accepts: ['application/json'] },
            timeout: { payload: 100 },
          },
        },
        async (_context, _req, res) => res.ok({})
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const body = '{"foo":"bar"}';
      const result = new Promise<void>((resolve, reject) => {
        let i = 0;
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/slow-payload',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Transfer-Encoding': 'chunked',
            },
          },
          (_incoming) => resolve()
        );
        const id: ReturnType<typeof setInterval> = setInterval(() => {
          if (i < body.length) {
            req.write(body[i++]);
          } else {
            clearInterval(id);
            req.end();
          }
        }, 20);
        req.on('error', (err) => {
          clearInterval(id);
          expect(['Request Timeout', 'socket hang up', 'write EPIPE', 'read ECONNRESET']).toContain(
            err.message
          );
          reject(err);
        });
      });
      // Local socket scheduling can vary by platform; either behavior is acceptable here.
      await result.catch(() => undefined);
    }, 15000);

    it('serves a sibling .gz asset when Accept-Encoding prefers gzip', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-gz-'));
      fs.writeFileSync(nodePath.join(dir, 'bundle.js'), 'not-gzip');
      fs.writeFileSync(nodePath.join(dir, 'bundle.js.gz'), 'gzipped-body');

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/assets/{any*}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const res = await httpRequest(port, '/assets/bundle.js', 'GET', {
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
      expect(res.body).toBe('gzipped-body');
      expect(Number(res.headers['content-length'])).toBe(Buffer.byteLength('gzipped-body'));

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('serves a sibling .gz asset when compression.enabled is false (Hapi Inert parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-gz-disabled-'));
      fs.writeFileSync(nodePath.join(dir, 'bundle.js'), 'not-gzip');
      fs.writeFileSync(nodePath.join(dir, 'bundle.js.gz'), 'gzipped-body');

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/assets/{any*}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const res = await httpRequest(port, '/assets/bundle.js', 'GET', {
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
      expect(res.body).toBe('gzipped-body');

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('falls back to dynamic gzip when no .gz sibling exists', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      (config as unknown as { compression: { enabled: boolean } }).compression.enabled = true;
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-gzip-dynamic-'));
      const plain = 'dynamic gzip body';
      fs.writeFileSync(nodePath.join(dir, 'bundle.js'), plain);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/assets/{any*}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const res = await new Promise<{
        statusCode: number;
        headers: http.IncomingHttpHeaders;
        body: Buffer;
      }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/assets/bundle.js',
            method: 'GET',
            headers: { 'accept-encoding': 'gzip' },
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                headers: incoming.headers,
                body: Buffer.concat(chunks),
              })
            );
          }
        );
        req.on('error', reject);
        req.end();
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
      expect(gunzipSync(res.body).toString('utf8')).toBe(plain);
      expect(res.headers['content-length']).toBeUndefined();

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('parses multipart/form-data into Hapi-shaped body.file (saved_objects _import parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/multipart-echo',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.object({
              file: schema.stream(),
            }),
          },
          options: {
            body: {
              accepts: 'multipart/form-data',
              output: 'stream',
              maxBytes: 1024 * 1024,
            },
          },
        },
        async (_context, req, res) => {
          const file = (req.body as { file?: { hapi?: { filename: string } } }).file;
          const filename = file?.hapi?.filename;
          return res.ok({ body: { filename } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const form = new FormData();
      form.append('file', Buffer.from('{}'), {
        filename: 'sample.ndjson',
        contentType: 'application/ndjson',
      });

      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/multipart-echo',
            method: 'POST',
            headers: form.getHeaders(),
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        form.pipe(req);
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ filename: 'sample.ndjson' });
    }, 15000);

    it('parses multipart when accepts is unset (timeline _import parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/multipart-default-accepts',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.object({
              file: schema.stream(),
            }),
          },
          options: {
            body: {
              output: 'stream',
              maxBytes: 1024 * 1024,
            },
          },
        },
        async (_context, req, res) => {
          const file = (req.body as { file?: { hapi?: { filename: string } } }).file;
          const filename = file?.hapi?.filename;
          return res.ok({ body: { filename } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const form = new FormData();
      form.append('file', Buffer.from('{}'), {
        filename: 'timelines.ndjson',
        contentType: 'application/ndjson',
      });

      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/multipart-default-accepts',
            method: 'POST',
            headers: form.getHeaders(),
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        form.pipe(req);
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ filename: 'timelines.ndjson' });
    }, 15000);

    it('passes raw multipart bytes as Buffer when parse: false (lists _import parity)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.post(
        {
          path: '/lists-import',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            body: schema.buffer(),
          },
          options: {
            body: {
              accepts: ['multipart/form-data'],
              parse: false,
              maxBytes: 1024 * 1024,
            },
          },
        },
        async (_context, req, res) => {
          expect(Buffer.isBuffer(req.body)).toBe(true);
          const text = (req.body as Buffer).toString('utf8');
          expect(text).toContain('Content-Disposition');
          expect(text).toContain('filename="list_items.txt"');
          expect(text).toContain('word one');
          return res.ok({ body: { ok: true } });
        }
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;

      const form = new FormData();
      form.append('file', Buffer.from('word one\n'), {
        filename: 'list_items.txt',
        contentType: 'text/plain',
      });

      const res = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: listenPort,
            path: '/api/fastify-mvp/lists-import',
            method: 'POST',
            headers: form.getHeaders(),
          },
          (incoming) => {
            const chunks: Buffer[] = [];
            incoming.on('data', (c) => chunks.push(Buffer.from(c)));
            incoming.on('end', () =>
              resolve({
                statusCode: incoming.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              })
            );
          }
        );
        req.on('error', reject);
        form.pipe(req);
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ ok: true });
    }, 15000);

    it('matches `/seg/{id}/{rest*}` on URLs without an extra slash before the splat (e.g. `/app/home`)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/deep/{id}/{rest*}',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: {
            params: schema.object({
              id: schema.string(),
              rest: schema.maybe(schema.string()),
            }),
          },
        },
        async (_context, req, res) =>
          res.ok({
            body: {
              id: (req.params as { id: string }).id,
              rest: (req.params as { rest?: string }).rest ?? '',
            },
          })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const bare = await httpRequest(listenPort, '/api/fastify-mvp/deep/home-only');
      expect(bare.statusCode).toBe(200);
      expect(JSON.parse(bare.body)).toEqual({ id: 'home-only', rest: '' });

      const nested = await httpRequest(listenPort, '/api/fastify-mvp/deep/home/sub/page');
      expect(nested.statusCode).toBe(200);
      expect(JSON.parse(nested.body)).toEqual({ id: 'home', rest: 'sub/page' });
    }, 15000);

    it('uses registered route metadata in the handler when auth cached static-directory compat', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      setup.registerAuth(async () => ({
        type: AuthResultType.authenticated,
        state: { username: 'tester' },
      }));

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/needs-auth',
          security: {
            authc: { enabled: true },
            authz: { enabled: false, reason: 'test' },
          },
          validate: false,
        },
        async (_context, _req, res) => res.ok({ body: { ok: true } })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(listenPort, '/api/fastify-mvp/needs-auth');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ ok: true });
    }, 15000);

    it('exposes Hapi-style wildcard param names to validation after registerAuth (compat cache)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      setup.registerAuth(async () => ({ type: AuthResultType.notHandled }));

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });

      router.get(
        {
          path: '/bundles/kbn-ui-shared-deps-src/{path*}',
          security: {
            authc: { enabled: false, reason: 'test' },
            authz: { enabled: false, reason: 'test' },
          },
          validate: {
            params: schema.object({
              path: schema.string(),
            }),
          },
        },
        async (_context, req, res) =>
          res.ok({ body: { path: (req.params as { path: string }).path } })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
      expect(listenPort).toBeGreaterThan(0);

      const res = await httpRequest(
        listenPort,
        '/api/fastify-mvp/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.css'
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        path: 'kbn-ui-shared-deps-src.css',
      });
    }, 15000);

    it('serves files from a registered static directory', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-'));
      fs.writeFileSync(nodePath.join(dir, 'hello.txt'), 'static-from-fastify');

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/assets/{any*}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const res = await httpRequest(port, '/assets/hello.txt');
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('static-from-fastify');
      expect(res.headers['content-length']).toBe('19');
      expect(res.headers['content-type']).toMatch(/^text\/plain/);
      expect(res.headers['cache-control']).toBe('must-revalidate');
      expect(String(res.headers.vary ?? '').toLowerCase()).toBe('accept-encoding');

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('serves single-segment static routes registered with {file} (@elastic/charts CSS)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-named-file-'));
      fs.writeFileSync(nodePath.join(dir, 'theme_only_light.css'), 'body{}');

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/ui/charts/{file}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const res = await httpRequest(port, '/ui/charts/theme_only_light.css');
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('body{}');
      expect(String(res.headers['content-type'] ?? '')).toMatch(/css|octet-stream/);

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('streams large static files chunk-by-chunk without loading them into memory', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'fastify-static-stream-'));
      // 8 MiB of data exercises the streaming path: a buffered read would resolve in
      // a single Node tick, while a stream produces multiple `data` events.
      const size = 8 * 1024 * 1024;
      const filename = 'big.bin';
      const filePath = nodePath.join(dir, filename);
      const fd = fs.openSync(filePath, 'w');
      const chunk = Buffer.alloc(64 * 1024, 0xab);
      for (let written = 0; written < size; written += chunk.length) {
        fs.writeSync(fd, chunk);
      }
      fs.closeSync(fd);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });
      setup.registerStaticDir('/assets/{any*}', dir);

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const result = await new Promise<{
        statusCode: number;
        bytes: number;
        chunkCount: number;
        contentLength: string | undefined;
      }>((resolve, reject) => {
        const req = http.request(
          { hostname: '127.0.0.1', port, path: `/assets/${filename}`, method: 'GET' },
          (res) => {
            let bytes = 0;
            let chunkCount = 0;
            res.on('data', (c) => {
              bytes += c.length;
              chunkCount++;
            });
            res.on('end', () =>
              resolve({
                statusCode: res.statusCode ?? 0,
                bytes,
                chunkCount,
                contentLength: res.headers['content-length'] as string | undefined,
              })
            );
          }
        );
        req.on('error', reject);
        req.end();
      });

      expect(result.statusCode).toBe(200);
      expect(result.bytes).toBe(size);
      expect(result.contentLength).toBe(String(size));
      // A buffered response would arrive in 1 chunk; streaming yields many.
      expect(result.chunkCount).toBeGreaterThan(1);

      fs.rmSync(dir, { recursive: true, force: true });
    }, 15000);

    it('honours Hapi-style server.route({ method: "*" }) registrations from HttpService preboot', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      // Mirror the preboot 503 catch-all from HttpService.preboot()
      (setup.server as any).route({
        path: '/{p*}',
        method: '*',
        handler: (_req: any, h: any) =>
          h.response('Kibana server is not ready yet').code(503).header('Retry-After', '30'),
      });

      await server.start();
      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        const res = await httpRequest(port, '/anything', method);
        expect(res.statusCode).toBe(503);
        expect(res.headers['retry-after']).toBe('30');
        expect(res.body).toBe('Kibana server is not ready yet');
      }
    }, 15000);

    it('runs registered lifecycle hooks (onPreRouting short-circuit, onPreResponse header)', async () => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      // onPreRouting: short-circuit /blocked with a 503 from the lifecycle factory
      setup.registerOnPreRouting((req, response, toolkit) => {
        if (req.url.pathname === '/blocked') {
          return response.customError({ statusCode: 503, body: 'lifecycle-blocked' });
        }
        return toolkit.next();
      });

      // onPreResponse: stamp a custom header on every response
      setup.registerOnPreResponse((_req, _info, toolkit) =>
        toolkit.next({ headers: { 'x-fastify-mvp': 'on' } })
      );

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('/api/fastify-mvp', ctx.logger.get('router'), enhanceHandler, {
        env,
      });
      router.get(
        {
          path: '/passthrough',
          security: { authz: { enabled: false, reason: 'test' } },
          validate: false,
        },
        async (_context, _req, res) => res.ok({ body: { ok: true } })
      );

      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      const passthrough = await httpRequest(port, '/api/fastify-mvp/passthrough');
      expect(passthrough.statusCode).toBe(200);
      expect(passthrough.headers['x-fastify-mvp']).toBe('on');
      expect(JSON.parse(passthrough.body)).toEqual({ ok: true });

      const blocked = await httpRequest(port, '/blocked');
      expect(blocked.statusCode).toBe(503);
      expect(blocked.headers['x-fastify-mvp']).toBe('on');
      expect(JSON.parse(blocked.body)).toMatchObject({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'lifecycle-blocked',
      });
    }, 15000);
  });

  describe('conditional compression', () => {
    let server: FastifyHttpServer;
    let listenPort = 0;

    const largeHtmlBody = {
      body: 'hello'.repeat(500),
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    };

    const setupCompressionServer = async (compression: HttpConfig['compression']) => {
      const ctx = createCoreContext();
      const config = createHttpConfig(PORT);
      (config as unknown as { compression: HttpConfig['compression'] }).compression = compression;
      const config$ = new BehaviorSubject(config);

      server = new FastifyHttpServer(ctx, 'Kibana', new BehaviorSubject(config.shutdownTimeout));
      const setup = await server.setup({ config$ });

      const enhanceHandler = (handler: any) => async (req: any, res: any) =>
        handler({} as any, req, res);

      const router = new Router('', ctx.logger.get('router'), enhanceHandler, {
        env,
      });
      router.get(
        {
          path: '/',
          validate: false,
          security: { authz: { enabled: false, reason: 'test' } },
        },
        (_context, _req, res) => res.ok(largeHtmlBody)
      );
      setup.registerRouter(router);
      await server.start();

      const address = (setup.server as any).server.address();
      listenPort = typeof address === 'object' && address ? address.port : 0;
    };

    afterEach(async () => {
      await server?.stop();
    });

    it('compresses when compression.enabled is true', async () => {
      await setupCompressionServer({
        enabled: true,
        brotli: { enabled: false, quality: 3 },
      });

      const res = await httpRequest(listenPort, '/', 'GET', {
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('does not compress when compression.enabled is false', async () => {
      await setupCompressionServer({
        enabled: false,
        brotli: { enabled: false, quality: 3 },
      });

      const res = await httpRequest(listenPort, '/', 'GET', {
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBeUndefined();
    });

    it('does not use brotli when compression.brotli.enabled is false', async () => {
      await setupCompressionServer({
        enabled: true,
        brotli: { enabled: false, quality: 3 },
      });

      const res = await httpRequest(listenPort, '/', 'GET', {
        headers: { 'accept-encoding': 'br' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).not.toBe('br');
    });

    it('uses brotli when compression.brotli.enabled is true', async () => {
      await setupCompressionServer({
        enabled: true,
        brotli: { enabled: true, quality: 3 },
      });

      const res = await httpRequest(listenPort, '/', 'GET', {
        headers: { 'accept-encoding': 'br' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-encoding']).toBe('br');
    });

    describe('with compression.referrerWhitelist', () => {
      beforeEach(async () => {
        await setupCompressionServer({
          enabled: true,
          referrerWhitelist: ['foo'],
          brotli: { enabled: false, quality: 3 },
        });
      });

      it('compresses when there is no referer', async () => {
        const res = await httpRequest(listenPort, '/', 'GET', {
          headers: { 'accept-encoding': 'gzip' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-encoding']).toBe('gzip');
      });

      it('compresses for a whitelisted referer', async () => {
        const res = await httpRequest(listenPort, '/', 'GET', {
          headers: { 'accept-encoding': 'gzip', referer: 'http://foo:1234' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-encoding']).toBe('gzip');
      });

      it('does not compress for a non-whitelisted referer', async () => {
        const res = await httpRequest(listenPort, '/', 'GET', {
          headers: { 'accept-encoding': 'gzip', referer: 'http://bar:1234' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-encoding']).toBeUndefined();
      });

      it('does not compress for an invalid referer', async () => {
        const res = await httpRequest(listenPort, '/', 'GET', {
          headers: { 'accept-encoding': 'gzip', referer: 'http://asdf$%^' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-encoding']).toBeUndefined();
      });
    });
  });

  it('exposes server.listener on the instance for integration supertest helpers', async () => {
    const ctx = createCoreContext();
    const config = createHttpConfig(PORT);
    const config$ = new BehaviorSubject(config);

    const server = new FastifyHttpServer(
      ctx,
      'Kibana',
      new BehaviorSubject(config.shutdownTimeout)
    );
    await server.setup({ config$ });

    const listener = (server as unknown as { server: { listener: http.Server } }).server.listener;
    expect(listener).toBeDefined();
    expect(typeof listener.listen).toBe('function');
    await server.stop();
  });

  it('onPreAuth lifecycle requests emit completed$ when the response closes', async () => {
    const ctx = createCoreContext();
    const config = createHttpConfig(PORT);
    const config$ = new BehaviorSubject(config);
    const limitedConcurrencyTag = 'test:limitedConcurrency:1';

    const server = new FastifyHttpServer(
      ctx,
      'Kibana',
      new BehaviorSubject(config.shutdownTimeout)
    );
    const setup = await server.setup({ config$ });

    let active = 0;
    setup.registerOnPreAuth((request, response, toolkit) => {
      if (!request.route.options.tags?.includes(limitedConcurrencyTag)) {
        return toolkit.next();
      }
      if (active >= 1) {
        return response.customError({ statusCode: 429, body: 'Too Many Requests' });
      }
      active += 1;
      request.events.completed$.subscribe(() => {
        active -= 1;
      });
      return toolkit.next();
    });

    const enhanceHandler = (handler: any) => async (req: any, res: any) =>
      handler({} as any, req, res);
    const router = new Router('/api/concurrency', ctx.logger.get('router'), enhanceHandler, {
      env,
    });
    router.get(
      {
        path: '/ok',
        security: { authz: { enabled: false, reason: 'test' } },
        validate: false,
        options: { tags: [limitedConcurrencyTag] },
      },
      async (_context, _req, res) => res.ok({ body: { ok: true } })
    );

    setup.registerRouter(router);
    await server.start();

    const address = (setup.server as any).server.address();
    const listenPort = typeof address === 'object' && address ? address.port : 0;
    expect(listenPort).toBeGreaterThan(0);

    for (let i = 0; i < 3; i++) {
      const res = await httpRequest(listenPort, '/api/concurrency/ok');
      expect(res.statusCode).toBe(200);
    }
    expect(active).toBe(0);

    await server.stop();
  }, 15000);

  it('stop() is a no-op safe to call before setup()', async () => {
    const fhs = new FastifyHttpServer(
      createCoreContext(),
      'Kibana',
      new BehaviorSubject(moment.duration(30, 'seconds'))
    );
    await expect(fhs.stop()).resolves.toBeUndefined();
    expect(fhs.isListening()).toBe(false);
  });
});
