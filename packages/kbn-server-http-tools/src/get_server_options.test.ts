/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import { getServerOptions } from './get_server_options';
import { IHttpConfig } from './types';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    // Hapi Inert patches native methods
    ...original,
    readFileSync: jest.fn(),
  };
});

const createConfig = (parts: Partial<IHttpConfig>): IHttpConfig => ({
  host: 'localhost',
  port: 5601,
  socketTimeout: 120000,
  keepaliveTimeout: 120000,
  shutdownTimeout: moment.duration(30, 'seconds'),
  maxPayload: ByteSizeValue.parse('1048576b'),
  ...parts,
  cors: {
    enabled: false,
    allowCredentials: false,
    allowOrigin: ['*'],
    ...parts.cors,
  },
  ssl: {
    enabled: false,
    ...parts.ssl,
  },
});

describe('getServerOptions', () => {
  beforeEach(() =>
    jest.requireMock('fs').readFileSync.mockImplementation((path: string) => `content-${path}`)
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('properly configures TLS with default options', () => {
    const httpConfig = createConfig({
      ssl: {
        enabled: true,
        key: 'some-key-path',
        certificate: 'some-certificate-path',
      },
    });

    expect(getServerOptions(httpConfig).tls).toMatchInlineSnapshot(`
      Object {
        "ca": undefined,
        "cert": "some-certificate-path",
        "ciphers": undefined,
        "honorCipherOrder": true,
        "key": "some-key-path",
        "passphrase": undefined,
        "rejectUnauthorized": undefined,
        "requestCert": undefined,
        "secureOptions": undefined,
      }
    `);
  });

  it('properly configures TLS with client authentication', () => {
    const httpConfig = createConfig({
      ssl: {
        enabled: true,
        key: 'some-key-path',
        certificate: 'some-certificate-path',
        certificateAuthorities: ['ca-1', 'ca-2'],
        cipherSuites: ['suite-a', 'suite-b'],
        keyPassphrase: 'passPhrase',
        rejectUnauthorized: true,
        requestCert: true,
        getSecureOptions: () => 42,
      },
    });

    expect(getServerOptions(httpConfig).tls).toMatchInlineSnapshot(`
      Object {
        "ca": Array [
          "ca-1",
          "ca-2",
        ],
        "cert": "some-certificate-path",
        "ciphers": "suite-a:suite-b",
        "honorCipherOrder": true,
        "key": "some-key-path",
        "passphrase": "passPhrase",
        "rejectUnauthorized": true,
        "requestCert": true,
        "secureOptions": 42,
      }
    `);
  });

  it('properly configures CORS when cors enabled', () => {
    const httpConfig = createConfig({
      cors: {
        enabled: true,
        allowCredentials: false,
        allowOrigin: ['*'],
      },
    });

    expect(getServerOptions(httpConfig).routes?.cors).toEqual({
      credentials: false,
      origin: ['*'],
      headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'kbn-xsrf'],
    });
  });
});
