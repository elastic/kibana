/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import tls from 'tls';
import type { Server as HttpServer } from 'http';
import type { Server as TlsServer } from 'https';
import { KBN_CERT_PATH, KBN_KEY_PATH, ES_KEY_PATH, ES_CERT_PATH } from '@kbn/dev-utils';
import {
  createServer,
  getListenerOptions,
  getServerOptions,
  getServerTLSOptions,
} from '@kbn/server-http-tools';
import {
  HttpConfig,
  config as httpConfig,
  cspConfig,
  externalUrlConfig,
} from '@kbn/core-http-server-internal';

function isServerTLS(server: HttpServer): server is TlsServer {
  return 'setSecureContext' in server;
}

const fetchPeerCertificate = (host: string, port: number) => {
  return new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), rejectUnauthorized: false });
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();
      resolve(cert);
    });
    socket.once('error', reject);
  });
};

const flattenCertificateChain = (
  cert: tls.DetailedPeerCertificate,
  accumulator: tls.DetailedPeerCertificate[] = []
) => {
  accumulator.push(cert);
  if (cert.issuerCertificate && cert.fingerprint256 !== cert.issuerCertificate.fingerprint256) {
    flattenCertificateChain(cert.issuerCertificate, accumulator);
  }
  return accumulator;
};

describe('foo', () => {
  const CSP_CONFIG = cspConfig.schema.validate({});
  const EXTERNAL_URL_CONFIG = externalUrlConfig.schema.validate({});

  beforeAll(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  it('bar', async () => {
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

    console.log(rawHttpConfig.ssl);

    const config = new HttpConfig(rawHttpConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG);

    const serverOptions = getServerOptions(config);
    const listenerOptions = getListenerOptions(config);
    const server = createServer(serverOptions, listenerOptions);

    await server.start();

    const listener = server.listener;
    // console.log('listener', listener.setSecureContext);

    // const a: ServerTLS;
    // a.setSecureContext()

    const certificate = await fetchPeerCertificate(config.host, config.port);
    const certificateChain = flattenCertificateChain(certificate);

    // console.log('certificates:', certificateChain);

    expect(isServerTLS(listener)).toEqual(true);
    expect(certificateChain.length).toEqual(1);
    expect(certificateChain[0].subject.CN).toEqual('kibana');

    // force TS to understand what we're working with.
    if (!isServerTLS(listener)) {
      throw new Error('Server should be a TLS server');
    }

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

    console.log(rawHttpConfig.ssl);

    const secondConfig = new HttpConfig(secondRawConfig, CSP_CONFIG, EXTERNAL_URL_CONFIG);

    const newTlsConfig = getServerTLSOptions(secondConfig.ssl)!;

    listener.setSecureContext(newTlsConfig);

    const secondCertificate = await fetchPeerCertificate(config.host, config.port);
    const secondCertificateChain = flattenCertificateChain(secondCertificate);

    // console.log('certificates:', certificateChain);

    expect(secondCertificateChain.length).toEqual(1);
    expect(secondCertificateChain[0].subject.CN).toEqual('elasticsearch');

    /*
    await supertest(listener)
      .get('/')
      //.disableTLSCerts()
      //.trustLocalhost(true)
      .expect(200)
      .then((res) => {
        // res.
        expect(res.text).toBe('some-string');
      });
    */

    await server.stop();
  });
});
