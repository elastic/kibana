/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyConfigOverrides } from './serve';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH, kibanaDevServiceAccount } from '@kbn/dev-utils';

const devServerConfig = {
  ssl: {
    enabled: true,
    certificate: KBN_CERT_PATH,
    key: KBN_KEY_PATH,
    certificateAuthorities: CA_CERT_PATH,
  },
};

describe('applyConfigOverrides', () => {
  it('merges empty objects to an empty config', () => {
    const output = applyConfigOverrides({}, {}, {}, {});
    const defaultEmptyConfig = {
      plugins: {
        paths: [],
      },
    };

    expect(output).toEqual(defaultEmptyConfig);
  });

  it('merges objects', () => {
    const output = applyConfigOverrides(
      {
        tomato: {
          size: 40,
          color: 'red',
        },
      },
      {},
      {
        tomato: {
          weight: 100,
        },
      },
      {}
    );

    expect(output).toEqual({
      tomato: {
        weight: 100,
        color: 'red',
        size: 40,
      },
      plugins: {
        paths: [],
      },
    });
  });

  it('merges objects, but not arrays', () => {
    const output = applyConfigOverrides(
      {
        tomato: {
          color: 'red',
          arr: [1, 2, 3],
        },
      },
      {},
      {
        xyz: 40,
        tomato: {
          weight: 100,
          arr: [4, 5],
        },
      },
      {}
    );

    expect(output).toEqual({
      xyz: 40,
      tomato: {
        weight: 100,
        color: 'red',
        arr: [4, 5],
      },
      plugins: {
        paths: [],
      },
    });
  });

  it('alters config to enable SAML Mock IdP and UIAM in serverless dev mode', () => {
    expect(applyConfigOverrides({}, { dev: true, serverless: true, uiam: true }, {}, {})).toEqual({
      csp: { form_action: ['https://localhost:8444'] },
      elasticsearch: {
        hosts: ['https://localhost:9200'],
        serviceAccountToken: kibanaDevServiceAccount.token,
        ssl: { certificateAuthorities: expect.stringContaining('ca.crt') },
      },
      mockIdpPlugin: { uiam: { enabled: true } },
      plugins: { paths: [] },
      server: devServerConfig,
      xpack: {
        cloud: {
          id: 'local-dev:ZG9ja2VyLmludGVybmFsOjkyMDAkaG9zdDo5MjAwJGtpYmFuYTo5MjAw',
          organization_id: 'org1234567890',
          projects_url: '',
          serverless: { project_id: 'abcdef12345678901234567890123456' },
        },
        security: {
          authc: {
            providers: {
              basic: { basic: { order: Number.MAX_SAFE_INTEGER } },
              saml: {
                'cloud-saml-kibana': {
                  description: 'Continue as Test User',
                  hint: 'Allows testing serverless user roles',
                  icon: 'user',
                  order: 0,
                  realm: 'cloud-saml-kibana',
                },
              },
            },
            selector: { enabled: false },
          },
          uiam: {
            enabled: true,
            sharedSecret: 'Dw7eRt5yU2iO9pL3aS4dF6gH8jK0lZ1xC2vB3nM4qW5=',
            url: 'https://localhost:8443',
            ssl: {
              certificate: KBN_CERT_PATH,
              key: KBN_KEY_PATH,
              verificationMode: 'none',
            },
          },
        },
      },
    });
  });

  it('alters config to enable SAML Mock IdP in stateful dev mode', () => {
    expect(applyConfigOverrides({}, { dev: true }, {}, {})).toEqual({
      elasticsearch: {
        username: 'kibana_system',
        password: 'changeme',
      },
      plugins: { paths: [] },
      server: devServerConfig,
      xpack: {
        security: {
          authc: {
            providers: {
              basic: { basic: { order: Number.MAX_SAFE_INTEGER } },
              saml: {
                'cloud-saml-kibana': {
                  description: 'Continue as Test User',
                  hint: 'Allows testing stateful user roles',
                  icon: 'user',
                  order: 0,
                  realm: 'cloud-saml-kibana',
                },
              },
            },
            selector: { enabled: false },
          },
        },
      },
    });
  });

  it('omits UIAM config if `--no-uiam` flag is passed in serverless dev mode', () => {
    expect(applyConfigOverrides({}, { dev: true, serverless: true, uiam: false }, {}, {})).toEqual({
      elasticsearch: {
        hosts: ['https://localhost:9200'],
        serviceAccountToken: kibanaDevServiceAccount.token,
        ssl: { certificateAuthorities: expect.stringContaining('ca.crt') },
      },
      plugins: { paths: [] },
      server: devServerConfig,
      xpack: {
        security: {
          authc: {
            providers: {
              basic: { basic: { order: Number.MAX_SAFE_INTEGER } },
              saml: {
                'cloud-saml-kibana': {
                  description: 'Continue as Test User',
                  hint: 'Allows testing serverless user roles',
                  icon: 'user',
                  order: 0,
                  realm: 'cloud-saml-kibana',
                },
              },
            },
            selector: { enabled: false },
          },
        },
      },
    });
  });

  describe('development HTTP configuration', () => {
    const { ssl: bundledSslConfig } = devServerConfig;

    it('enables TLS without changing the Elasticsearch connection', () => {
      const elasticsearch = {
        hosts: ['https://remote-es.example:9200'],
        ssl: { certificateAuthorities: '/custom/es-ca.crt' },
      };
      const output = applyConfigOverrides({ elasticsearch }, { dev: true }, {}, {});

      expect(output.server).toEqual(devServerConfig);
      expect(output.elasticsearch.hosts).toEqual(['https://remote-es.example:9200']);
      expect(output.elasticsearch.ssl).toEqual({ certificateAuthorities: '/custom/es-ca.crt' });
    });

    it('keeps HTTP for non-interactive runs with --no-dev-config', () => {
      const output = applyConfigOverrides({}, { dev: true, devConfig: false }, {}, {});

      expect(output).not.toHaveProperty('server');
    });

    it('enables TLS with --http2 even with --no-dev-config', () => {
      const output = applyConfigOverrides({}, { dev: true, devConfig: false, http2: true }, {}, {});

      expect(output.server).toEqual({ protocol: 'http2', ssl: bundledSslConfig });
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
      expect(() =>
        applyConfigOverrides({}, { dev: true, http2: true, ssl: false }, {}, {})
      ).toThrow("Can't use --http2 with --no-ssl. HTTP/2 requires TLS.");
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

      expect(output.server).toEqual(devServerConfig);
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
});
