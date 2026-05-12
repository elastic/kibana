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
import { MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-plugin/common';

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
      server: { publicBaseUrl: 'http://localhost:5601' },
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
          mcp: {
            oauth2: {
              metadata: {
                authorization_servers: [MOCK_IDP_UIAM_OAUTH_BASE_URL],
                resource: 'http://localhost:5601',
              },
            },
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

  it('uses https for server.publicBaseUrl and the MCP protected resource when --ssl is passed', () => {
    const config = applyConfigOverrides(
      {},
      { dev: true, serverless: true, uiam: true, ssl: true },
      {},
      {}
    );

    expect(config.server.publicBaseUrl).toBe('https://localhost:5601');
    expect(config.xpack.security.mcp.oauth2.metadata.resource).toBe('https://localhost:5601');
  });

  it('uses https when server.ssl.enabled is set in config', () => {
    const config = applyConfigOverrides(
      { server: { ssl: { enabled: true } } },
      { dev: true, serverless: true, uiam: true },
      {},
      {}
    );

    expect(config.server.publicBaseUrl).toBe('https://localhost:5601');
    expect(config.xpack.security.mcp.oauth2.metadata.resource).toBe('https://localhost:5601');
  });

  it('preserves a user-provided server.publicBaseUrl and reuses it for the MCP protected resource', () => {
    const config = applyConfigOverrides(
      { server: { publicBaseUrl: 'https://kibana.example.test' } },
      { dev: true, serverless: true, uiam: true },
      {},
      {}
    );

    expect(config.server.publicBaseUrl).toBe('https://kibana.example.test');
    expect(config.xpack.security.mcp).toEqual({
      oauth2: {
        metadata: {
          authorization_servers: [MOCK_IDP_UIAM_OAUTH_BASE_URL],
          resource: 'https://kibana.example.test',
        },
      },
    });
  });

  it('preserves user-provided MCP protected resource metadata', () => {
    const config = applyConfigOverrides(
      {
        xpack: {
          security: {
            mcp: {
              oauth2: {
                metadata: {
                  authorization_servers: ['https://my-idp.example.test/oauth2'],
                  resource: 'https://my-kibana.example.test/api/agent_builder/mcp',
                },
              },
            },
          },
        },
      },
      { dev: true, serverless: true, uiam: true },
      {},
      {}
    );

    expect(config.xpack.security.mcp).toEqual({
      oauth2: {
        metadata: {
          authorization_servers: ['https://my-idp.example.test/oauth2'],
          resource: 'https://my-kibana.example.test/api/agent_builder/mcp',
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
