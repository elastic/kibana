/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyConfigOverrides } from './serve';
import { kibanaDevServiceAccount } from '@kbn/dev-utils';

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

  it('alters config to enable SAML Mock IdP in serverless dev mode', () => {
    expect(applyConfigOverrides({}, { dev: true, serverless: true }, {}, {})).toEqual({
      elasticsearch: {
        hosts: ['https://localhost:9200'],
        serviceAccountToken: kibanaDevServiceAccount.token,
        ssl: { certificateAuthorities: expect.stringContaining('ca.crt') },
      },
      plugins: { paths: [] },
      server: { prototypeHardening: true },
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

  it('alters config to enable UIAM if `--uiam` flag is passed in serverless dev mode', () => {
    expect(applyConfigOverrides({}, { dev: true, serverless: true, uiam: true }, {}, {})).toEqual({
      elasticsearch: {
        hosts: ['https://localhost:9200'],
        serviceAccountToken: kibanaDevServiceAccount.token,
        ssl: { certificateAuthorities: expect.stringContaining('ca.crt') },
      },
      mockIdpPlugin: { uiam: { enabled: true } },
      plugins: { paths: [] },
      server: { prototypeHardening: true },
      xpack: {
        cloud: {
          organization_id: '1234567890',
          projects_url: '',
          serverless: { project_id: 'abcde1234567890' },
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
            sharedSecret: 'XmLutyDzrWDcz9i+xXRXzSMJEfulI+Q9yIaibncLRyA=',
            url: 'http://localhost:8080',
          },
        },
      },
    });
  });
});
