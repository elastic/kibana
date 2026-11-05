/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fixedHttpsOrigins } from './fixed_https_origins';

const responses = { '200': { description: 'ok' } };

describe('fixedHttpsOrigins', () => {
  it('collects root, path item and operation servers across sources, once each', () => {
    expect(
      fixedHttpsOrigins({
        v1: {
          openapi: '3.0.3',
          servers: [{ url: 'https://api.example.com/v1' }],
          paths: {
            '/items': { get: { responses } },
            '/files': {
              servers: [{ url: 'https://files.example.com' }],
              get: { responses },
              post: { servers: [{ url: 'https://upload.example.com/v1' }], responses },
            },
          },
        },
        v2: {
          openapi: '3.0.3',
          servers: [{ url: 'https://api.example.com/v2' }],
          paths: {},
        },
      })
    ).toEqual([
      'https://api.example.com',
      'https://files.example.com',
      'https://upload.example.com',
    ]);
  });

  it('collects absolute token and refresh URLs of OAuth flows', () => {
    expect(
      fixedHttpsOrigins({
        v1: {
          openapi: '3.0.3',
          servers: [{ url: 'https://api.example.com' }],
          paths: {},
          components: {
            securitySchemes: {
              key: { type: 'apiKey', in: 'header', name: 'x-key' },
              oauth: {
                type: 'oauth2',
                flows: {
                  clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} },
                  password: {
                    tokenUrl: '/token',
                    refreshUrl: 'https://refresh.example.com/token',
                    scopes: {},
                  },
                },
              },
            },
          },
        },
      })
    ).toEqual([
      'https://api.example.com',
      'https://auth.example.com',
      'https://refresh.example.com',
    ]);
  });

  it('keeps a fixed origin whose path has variables', () => {
    expect(
      fixedHttpsOrigins({
        v1: {
          openapi: '3.0.3',
          servers: [
            { url: 'https://api.example.com/{version}', variables: { version: { default: 'v1' } } },
          ],
          paths: {},
        },
      })
    ).toEqual(['https://api.example.com']);
  });

  it('leaves out origins that depend on connector config, and plain HTTP', () => {
    expect(
      fixedHttpsOrigins({
        v1: {
          openapi: '3.0.3',
          servers: [
            { url: 'https://{subdomain}.example.com', variables: { subdomain: { default: 'a' } } },
            { url: 'https://api.{region}.example.com/v1', variables: { region: { default: 'a' } } },
            { url: 'https://api.example.com{base}', variables: { base: { default: '/v1' } } },
            { url: 'http://plain.example.com' },
            { url: '/relative' },
          ],
          paths: { '/items': { get: { responses } } },
        },
      })
    ).toEqual([]);
  });

  it('reads the root servers of a spec without operations by path', () => {
    expect(
      fixedHttpsOrigins({
        mcp: {
          format: 'mcp',
          servers: [{ url: 'https://mcp.example.com/sse' }],
          tools: [],
        },
      })
    ).toEqual(['https://mcp.example.com']);
  });
});
