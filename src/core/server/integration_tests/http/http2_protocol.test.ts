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
} from '@kbn/core-http-server-internal';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { Logger } from '@kbn/logging';

const CSP_CONFIG = cspConfig.schema.validate({});
const EXTERNAL_URL_CONFIG = externalUrlConfig.schema.validate({});

describe('Http2 - Smoke tests', () => {
  let server: HttpServer;
  let config: HttpConfig;
  let logger: Logger;
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

  beforeAll(() => {
    // required for self-signed certificates
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
    config = new HttpConfig(rawConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG);

    server = new HttpServer(coreContext, 'tests', of(config.shutdownTimeout));
  });

  describe('When HTTP2 is enabled', () => {
    let innerServerListener: Server;

    beforeEach(async () => {
      const { registerRouter, server: innerServer } = await server.setup({ config$: of(config) });
      innerServerListener = innerServer.listener;

      const router = new Router('', logger, enhanceWithContext, {
        isDev: false,
        versionedRouterOptions: {
          defaultHandlerResolutionStrategy: 'oldest',
        },
      });
      router.post(
        {
          path: '/',
          validate: false,
        },
        async (context, req, res) => {
          return res.ok({ body: { ok: true } });
        }
      );
      registerRouter(router);

      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    test('Should respond to POST endpoint', async () => {
      const response = await supertest(innerServerListener).post('/').http2();

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({ ok: true });
    });

    test('Should respond to POST endpoint on HTTP/1.1', async () => {
      const response = await supertest(innerServerListener).post('/');

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({ ok: true });
    });
  });
});
