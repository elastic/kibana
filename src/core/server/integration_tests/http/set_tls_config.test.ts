/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { KBN_CERT_PATH, KBN_KEY_PATH, ES_KEY_PATH, ES_CERT_PATH } from '@kbn/dev-utils';
import { createServer, getServerOptions, setTlsConfig } from '@kbn/server-http-tools';
import {
  HttpConfig,
  config as httpConfig,
  cspConfig,
  externalUrlConfig,
  permissionsPolicyConfig,
} from '@kbn/core-http-server-internal';
import { flattenCertificateChain, fetchPeerCertificate, isServerTLS } from './tls_utils';

describe('setTlsConfig', () => {
  const CSP_CONFIG = cspConfig.schema.validate({});
  const EXTERNAL_URL_CONFIG = externalUrlConfig.schema.validate({});
  const PERMISSIONS_POLICY_CONFIG = permissionsPolicyConfig.schema.validate({});

  beforeAll(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  it('replaces the TLS configuration on the HAPI server', async () => {
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
    const firstConfig = new HttpConfig(
      rawHttpConfig,
      CSP_CONFIG,
      EXTERNAL_URL_CONFIG,
      PERMISSIONS_POLICY_CONFIG
    );

    const serverOptions = getServerOptions(firstConfig);
    const server = createServer(serverOptions);

    server.route({
      method: 'GET',
      path: '/',
      handler: (request, toolkit) => {
        return toolkit.response('ok');
      },
    });

    await server.start();

    const listener = server.listener;

    // force TS to understand what we're working with.
    if (!isServerTLS(listener)) {
      throw new Error('Server should be a TLS server');
    }

    const certificate = await fetchPeerCertificate(firstConfig.host, firstConfig.port);
    const certificateChain = flattenCertificateChain(certificate);

    expect(isServerTLS(listener)).toEqual(true);
    expect(certificateChain.length).toEqual(1);
    expect(certificateChain[0].subject.CN).toEqual('kibana');

    await supertest(listener).get('/').expect(200);

    const secondRawConfig = httpConfig.schema.validate({
      name: 'kibana',
      host: '127.0.0.1',
      port: 10002,
      protocol: 'http1',
      ssl: {
        enabled: true,
        certificate: ES_CERT_PATH,
        key: ES_KEY_PATH,
        cipherSuites: ['TLS_AES_256_GCM_SHA384'],
        redirectHttpFromPort: 10003,
      },
      shutdownTimeout: '1s',
    });

    const secondConfig = new HttpConfig(
      secondRawConfig,
      CSP_CONFIG,
      EXTERNAL_URL_CONFIG,
      PERMISSIONS_POLICY_CONFIG
    );

    setTlsConfig(server, secondConfig.ssl);

    const secondCertificate = await fetchPeerCertificate(firstConfig.host, firstConfig.port);
    const secondCertificateChain = flattenCertificateChain(secondCertificate);

    expect(secondCertificateChain.length).toEqual(1);
    expect(secondCertificateChain[0].subject.CN).toEqual('elasticsearch');

    await supertest(listener).get('/').expect(200);

    await server.stop();
  });
});
