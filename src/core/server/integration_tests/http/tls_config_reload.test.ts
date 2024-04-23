/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { duration } from 'moment';
import { BehaviorSubject, of } from 'rxjs';
import { KBN_CERT_PATH, KBN_KEY_PATH, ES_KEY_PATH, ES_CERT_PATH } from '@kbn/dev-utils';
import { Router } from '@kbn/core-http-router-server-internal';
import {
  HttpServer,
  HttpConfig,
  config as httpConfig,
  cspConfig,
  externalUrlConfig,
} from '@kbn/core-http-server-internal';
import { isServerTLS, flattenCertificateChain, fetchPeerCertificate } from './tls_utils';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { Logger } from '@kbn/logging';

const CSP_CONFIG = cspConfig.schema.validate({});
const EXTERNAL_URL_CONFIG = externalUrlConfig.schema.validate({});
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

describe('HttpServer - TLS config', () => {
  let server: HttpServer;
  let logger: Logger;

  beforeAll(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  beforeEach(() => {
    const coreContext = mockCoreContext.create();
    logger = coreContext.logger.get();
    server = new HttpServer(coreContext, 'tests', of(duration('1s')));
  });

  it('supports dynamic reloading of the TLS configuration', async () => {
    const rawHttpConfig = httpConfig.schema.validate({
      name: 'kibana',
      host: '127.0.0.1',
      port: 10002,
      ssl: {
        enabled: true,
        certificate: KBN_CERT_PATH,
        key: KBN_KEY_PATH,
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
        redirectHttpFromPort: 10003,
      },
      shutdownTimeout: '1s',
    });
    const firstConfig = new HttpConfig(rawHttpConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG);

    const config$ = new BehaviorSubject(firstConfig);

    const { server: innerServer, registerRouter } = await server.setup({ config$ });
    const listener = innerServer.listener;

    const router = new Router('', logger, enhanceWithContext, {
      isDev: false,
      versionedRouterOptions: {
        defaultHandlerResolutionStrategy: 'oldest',
      },
    });
    router.get(
      {
        path: '/',
        validate: false,
      },
      async (ctx, req, res) => {
        return res.ok({
          body: 'ok',
        });
      }
    );
    registerRouter(router);

    await server.start();

    // force TS to understand what we're working with.
    if (!isServerTLS(listener)) {
      throw new Error('Server should be a TLS server');
    }

    const certificate = await fetchPeerCertificate(firstConfig.host, firstConfig.port);
    const certificateChain = flattenCertificateChain(certificate);

    expect(certificateChain.length).toEqual(1);
    expect(certificateChain[0].subject.CN).toEqual('kibana');

    await supertest(listener).get('/').expect(200);

    const secondRawConfig = httpConfig.schema.validate({
      name: 'kibana',
      host: '127.0.0.1',
      port: 10002,
      ssl: {
        enabled: true,
        certificate: ES_CERT_PATH,
        key: ES_KEY_PATH,
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
        redirectHttpFromPort: 10003,
      },
      shutdownTimeout: '1s',
    });

    const secondConfig = new HttpConfig(secondRawConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG);
    config$.next(secondConfig);

    const secondCertificate = await fetchPeerCertificate(firstConfig.host, firstConfig.port);
    const secondCertificateChain = flattenCertificateChain(secondCertificate);

    expect(secondCertificateChain.length).toEqual(1);
    expect(secondCertificateChain[0].subject.CN).toEqual('elasticsearch');

    await supertest(listener).get('/').expect(200);

    await server.stop();
  });
});
