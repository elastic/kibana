/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyConfigOverrides } from './serve';
import { KBN_CERT_PATH, KBN_KEY_PATH, kibanaDevServiceAccount } from '@kbn/dev-utils';

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
      elasticsearch: {
        hosts: ['https://localhost:9200'],
        serviceAccountToken: kibanaDevServiceAccount.token,
        ssl: { certificateAuthorities: expect.stringContaining('ca.crt') },
      },
      mockIdpPlugin: { uiam: { enabled: true } },
      plugins: { paths: [] },
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
      server: { basePath: '/kbn', publicBaseUrl: 'http://localhost:5601/kbn' },
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

  it('omits the fixed base path in stateful dev mode when `--no-base-path` is passed', () => {
    const config = applyConfigOverrides({}, { dev: true, basePath: false }, {}, {});
    expect(config.server).toEqual({ publicBaseUrl: 'http://localhost:5601' });
  });

  it('omits the fixed base path in stateful dev mode when `--run-examples` is passed', () => {
    const config = applyConfigOverrides({}, { dev: true, runExamples: true }, {}, {});
    expect(config.server).toEqual({ publicBaseUrl: 'http://localhost:5601' });
  });

  it('keeps a user-provided server.basePath in stateful dev mode and derives publicBaseUrl from it', () => {
    const config = applyConfigOverrides({ server: { basePath: '/custom' } }, { dev: true }, {}, {});
    expect(config.server).toEqual({
      basePath: '/custom',
      publicBaseUrl: 'http://localhost:5601/custom',
    });
  });

  it('derives publicBaseUrl from a user-customized server.port in stateful dev mode', () => {
    const config = applyConfigOverrides(
      { server: { basePath: '/custom', port: 5701 } },
      { dev: true },
      {},
      {}
    );
    expect(config.server).toEqual({
      basePath: '/custom',
      port: 5701,
      publicBaseUrl: 'http://localhost:5701/custom',
    });
  });

  it('respects a user-provided server.publicBaseUrl in stateful dev mode', () => {
    const config = applyConfigOverrides(
      { server: { publicBaseUrl: 'https://kibana.example.com/kbn' } },
      { dev: true },
      {},
      {}
    );
    expect(config.server).toEqual({
      basePath: '/kbn',
      publicBaseUrl: 'https://kibana.example.com/kbn',
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
});
