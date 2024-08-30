/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server } from 'http';
import supertest from 'supertest';
import { of } from 'rxjs';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { Router } from '@kbn/core-http-router-server-internal';
import {
  HttpServer,
  HttpConfig,
  config as httpConfig,
  cspConfig,
  externalUrlConfig,
  permissionsPolicyConfig,
} from '@kbn/core-http-server-internal';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { Logger } from '@kbn/logging';

const CSP_CONFIG = cspConfig.schema.validate({});
const EXTERNAL_URL_CONFIG = externalUrlConfig.schema.validate({});
const PERMISSIONS_POLICY_CONFIG = permissionsPolicyConfig.schema.validate({});

describe('Http2 - Smoke tests', () => {
  let server: HttpServer;
  let config: HttpConfig;
  let logger: Logger;
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let innerServerListener: Server;

  const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

  beforeAll(() => {
    // required for the self-signed certificates used in testing
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  beforeEach(() => {
    coreContext = mockCoreContext.create();
    logger = coreContext.logger.get();

    const rawConfig = httpConfig.schema.validate({
      name: 'kibana',
      protocol: 'http2',
      host: '127.0.0.1',
      port: 10002,
      ssl: {
        enabled: true,
        certificate: KBN_CERT_PATH,
        key: KBN_KEY_PATH,
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
        redirectHttpFromPort: 10003,
      },
      shutdownTimeout: '5s',
    });
    config = new HttpConfig(rawConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG, PERMISSIONS_POLICY_CONFIG);
    server = new HttpServer(coreContext, 'tests', of(config.shutdownTimeout));
  });

  afterEach(async () => {
    await server?.stop();
  });

  describe('Basic tests against all supported methods', () => {
    beforeEach(async () => {
      const { registerRouter, server: innerServer } = await server.setup({ config$: of(config) });
      innerServerListener = innerServer.listener;

      const router = new Router('', logger, enhanceWithContext, {
        isDev: false,
        versionedRouterOptions: {
          defaultHandlerResolutionStrategy: 'oldest',
        },
      });

      router.post({ path: '/', validate: false }, async (context, req, res) => {
        return res.ok({
          body: { protocol: req.protocol, httpVersion: req.httpVersion },
        });
      });
      router.get({ path: '/', validate: false }, async (context, req, res) => {
        return res.ok({
          body: { protocol: req.protocol, httpVersion: req.httpVersion },
        });
      });
      router.put({ path: '/', validate: false }, async (context, req, res) => {
        return res.ok({
          body: { protocol: req.protocol, httpVersion: req.httpVersion },
        });
      });
      router.delete({ path: '/', validate: false }, async (context, req, res) => {
        return res.ok({
          body: { protocol: req.protocol, httpVersion: req.httpVersion },
        });
      });

      registerRouter(router);

      await server.start();
    });

    describe('POST', () => {
      it('should respond to POST endpoint for an HTTP/2 request', async () => {
        const response = await supertest(innerServerListener).post('/').http2();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http2', httpVersion: '2.0' });
      });

      it('should respond to POST endpoint for an HTTP/1.x request', async () => {
        const response = await supertest(innerServerListener).post('/');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http1', httpVersion: '1.1' });
      });
    });

    describe('GET', () => {
      it('should respond to GET endpoint for an HTTP/2 request', async () => {
        const response = await supertest(innerServerListener).get('/').http2();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http2', httpVersion: '2.0' });
      });

      it('should respond to GET endpoint for an HTTP/1.x request', async () => {
        const response = await supertest(innerServerListener).get('/');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http1', httpVersion: '1.1' });
      });
    });

    describe('DELETE', () => {
      it('should respond to DELETE endpoint for an HTTP/2 request', async () => {
        const response = await supertest(innerServerListener).delete('/').http2();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http2', httpVersion: '2.0' });
      });

      it('should respond to DELETE endpoint for an HTTP/1.x request', async () => {
        const response = await supertest(innerServerListener).delete('/');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http1', httpVersion: '1.1' });
      });
    });

    describe('PUT', () => {
      it('should respond to PUT endpoint for an HTTP/2 request', async () => {
        const response = await supertest(innerServerListener).put('/').http2();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http2', httpVersion: '2.0' });
      });

      it('should respond to PUT endpoint for an HTTP/1.x request', async () => {
        const response = await supertest(innerServerListener).put('/');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http1', httpVersion: '1.1' });
      });
    });
  });

  describe('HTTP2-specific behaviors', () => {
    beforeEach(async () => {
      const { registerRouter, server: innerServer } = await server.setup({ config$: of(config) });
      innerServerListener = innerServer.listener;

      const router = new Router('', logger, enhanceWithContext, {
        isDev: false,
        versionedRouterOptions: {
          defaultHandlerResolutionStrategy: 'oldest',
        },
      });

      router.get({ path: '/illegal_headers', validate: false }, async (context, req, res) => {
        return res.ok({
          headers: {
            connection: 'close',
          },
          body: { protocol: req.protocol },
        });
      });

      registerRouter(router);

      await server.start();
    });

    describe('illegal http2 headers', () => {
      it('should strip illegal http2 headers without causing errors when serving HTTP/2', async () => {
        const response = await supertest(innerServerListener).get('/illegal_headers').http2();

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http2' });
        expect(response.header).toEqual(expect.not.objectContaining({ connection: 'close' }));
      });

      it('should keep illegal http2 headers when serving HTTP/1.x', async () => {
        const response = await supertest(innerServerListener).get('/illegal_headers');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ protocol: 'http1' });
        expect(response.header).toEqual(expect.objectContaining({ connection: 'close' }));
      });
    });
  });
});
