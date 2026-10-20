/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { applyConfigOverrides } from './serve';

describe('development HTTP configuration', () => {
  const bundledSslConfig = {
    enabled: true,
    certificate: KBN_CERT_PATH,
    key: KBN_KEY_PATH,
    certificateAuthorities: CA_CERT_PATH,
  };

  it('enables TLS without changing the Elasticsearch connection', () => {
    const elasticsearch = {
      hosts: ['https://remote-es.example:9200'],
      ssl: { certificateAuthorities: '/custom/es-ca.crt' },
    };
    const output = applyConfigOverrides({ elasticsearch }, { dev: true }, {}, {});

    expect(output.server).toEqual({ ssl: bundledSslConfig });
    expect(output.elasticsearch.hosts).toEqual(['https://remote-es.example:9200']);
    expect(output.elasticsearch.ssl).toEqual({ certificateAuthorities: '/custom/es-ca.crt' });
  });

  it('does not enable TLS outside development mode', () => {
    expect(applyConfigOverrides({}, {}, {}, {})).not.toHaveProperty('server');
  });

  it('disables TLS with --no-ssl, even when enabled in the config file', () => {
    const output = applyConfigOverrides(
      { server: { ssl: { enabled: true } } },
      { dev: true, ssl: false },
      {},
      {}
    );

    expect(output.server).toEqual({ ssl: { enabled: false } });
    expect(output.elasticsearch).not.toHaveProperty('hosts');
    expect(output.elasticsearch).not.toHaveProperty('ssl');
  });

  it('rejects --http2 combined with --no-ssl', () => {
    expect(() => applyConfigOverrides({}, { dev: true, http2: true, ssl: false }, {}, {})).toThrow(
      "Can't use --http2 with --no-ssl. HTTP/2 requires TLS."
    );
  });

  it('keeps --http2 as an explicit override without enabling Elasticsearch TLS', () => {
    const output = applyConfigOverrides(
      { server: { protocol: 'http1', ssl: { enabled: false } } },
      { dev: true, http2: true },
      {},
      {}
    );

    expect(output.server).toEqual({ protocol: 'http2', ssl: bundledSslConfig });
    expect(output.elasticsearch).not.toHaveProperty('hosts');
    expect(output.elasticsearch).not.toHaveProperty('ssl');
  });

  it('keeps --ssl enabling TLS for both Kibana and Elasticsearch', () => {
    const output = applyConfigOverrides({}, { dev: true, ssl: true }, {}, {});

    expect(output.server.ssl).toEqual(bundledSslConfig);
    expect(output.elasticsearch).toMatchObject({
      hosts: ['https://localhost:9200'],
      ssl: { certificateAuthorities: CA_CERT_PATH },
    });
  });

  it('allows --http2 with custom TLS credentials', () => {
    const ssl = { certificate: '/custom/server.crt', key: '/custom/server.key' };
    const output = applyConfigOverrides({ server: { ssl } }, { dev: true, http2: true }, {}, {});

    expect(output.server).toEqual({ protocol: 'http2', ssl: { enabled: true, ...ssl } });
  });

  describe.each(['config file', 'CLI', 'keystore'] as const)('%s overrides', (source) => {
    const applyServerConfig = (server: object) =>
      applyConfigOverrides(
        source === 'config file' ? { server } : {},
        { dev: true },
        source === 'CLI' ? { server } : {},
        source === 'keystore' ? { server } : {}
      ).server;

    it('honors disabled TLS without injecting credentials', () => {
      expect(applyServerConfig({ ssl: { enabled: false } })).toEqual({
        ssl: { enabled: false },
      });
    });

    it('honors an explicit HTTP/1 protocol while enabling TLS', () => {
      expect(applyServerConfig({ protocol: 'http1' })).toEqual({
        protocol: 'http1',
        ssl: bundledSslConfig,
      });
    });

    it.each([
      { certificate: '/custom/server.crt', key: '/custom/server.key' },
      { keystore: { path: '/custom/server.p12', password: 'password' } },
      { certificate: '/custom/server.crt' },
      { key: '/custom/server.key' },
    ])('does not mix bundled credentials with %j', (ssl) => {
      expect(applyServerConfig({ ssl })).toEqual({ ssl: { enabled: true, ...ssl } });
    });

    it.each([
      { certificateAuthorities: ['/custom/ca.crt'] },
      { truststore: { path: '/custom/trust.p12' } },
    ])('preserves custom trust settings %j', (ssl) => {
      expect(applyServerConfig({ ssl })).toEqual({
        ssl: { enabled: true, certificate: KBN_CERT_PATH, key: KBN_KEY_PATH, ...ssl },
      });
    });
  });
});
