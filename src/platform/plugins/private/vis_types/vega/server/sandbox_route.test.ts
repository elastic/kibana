/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createSandboxCsp,
  getImgSrcSourcesFromPolicy,
  registerSandboxRoute,
} from './sandbox_route';
import { VEGA_SANDBOX_ROUTE_PATH } from '../common/sandbox_constants';

describe('Vega sandbox route CSP helpers', () => {
  test('maps broad allow-all policy to wildcard image source when there are no deny rules', () => {
    expect(getImgSrcSourcesFromPolicy([{ allow: true }], 'https://kibana.example.com')).toEqual([
      'https://kibana.example.com',
      '*',
    ]);
  });

  test('does not map broad allow rules when deny rules are present', () => {
    expect(
      getImgSrcSourcesFromPolicy(
        [
          { allow: true },
          { allow: true, host: 'static.example.com', protocol: 'https' },
          { allow: false, host: 'blocked.example.com' },
        ],
        'https://kibana.example.com'
      )
    ).toEqual([
      'https://kibana.example.com',
      'https://static.example.com',
      'https://*.static.example.com',
    ]);
  });

  test('maps protocol-only rules to CSP scheme sources', () => {
    expect(getImgSrcSourcesFromPolicy([{ allow: true, protocol: 'https' }])).toEqual(['https:']);
  });

  test('builds a locked-down document CSP with strict-dynamic script loading', () => {
    expect(
      createSandboxCsp({ imgSrcSources: ['https://kibana.example.com'], nonce: 'abc123' })
    ).toBe(
      [
        "default-src 'none'",
        "script-src 'nonce-abc123' 'strict-dynamic'",
        'img-src https://kibana.example.com',
        "style-src 'unsafe-inline'",
      ].join('; ')
    );
  });
});

describe('registerSandboxRoute', () => {
  test('injects a route-scoped CSP header derived from externalUrl.policy', async () => {
    const router = { get: jest.fn() };
    const registerOnPreResponse = jest.fn();
    const core = {
      http: {
        createRouter: () => router,
        registerOnPreResponse,
        staticAssets: { prependPublicUrl: (path: string) => path },
        basePath: { publicBaseUrl: 'https://kibana.example.com/base' },
        externalUrl: {
          policy: [{ allow: true, host: 'static.example.com', protocol: 'https' }],
        },
      },
    } as any;

    registerSandboxRoute(core);

    const handler = router.get.mock.calls[0][1];
    const onPreResponse = registerOnPreResponse.mock.calls[0][0];

    const request = {
      uuid: 'request-uuid',
      route: { path: VEGA_SANDBOX_ROUTE_PATH },
      url: new URL('https://kibana.example.com/base/internal/vis_type_vega/sandbox'),
    } as any;

    const responseFactory = { ok: jest.fn((args) => args) } as any;
    await handler({}, request, responseFactory);

    const toolkit = { next: jest.fn((args) => args ?? { type: 'next' }) } as any;
    const result = onPreResponse(request, {} as any, toolkit);

    expect(result?.headers?.['Content-Security-Policy']).toContain("default-src 'none'");
    expect(result?.headers?.['Content-Security-Policy']).toContain("'strict-dynamic'");
    expect(result?.headers?.['Content-Security-Policy']).toContain('img-src');
    expect(result?.headers?.['Content-Security-Policy']).toContain('https://kibana.example.com');
    expect(result?.headers?.['Content-Security-Policy']).toContain('https://static.example.com');
    expect(result?.headers?.['Content-Security-Policy']).toContain('https://*.static.example.com');
  });

  test('does not modify responses for other routes', () => {
    const router = { get: jest.fn() };
    const registerOnPreResponse = jest.fn();
    const core = {
      http: {
        createRouter: () => router,
        registerOnPreResponse,
        staticAssets: { prependPublicUrl: (path: string) => path },
        basePath: { publicBaseUrl: 'https://kibana.example.com/base' },
        externalUrl: { policy: [] },
      },
    } as any;

    registerSandboxRoute(core);
    const onPreResponse = registerOnPreResponse.mock.calls[0][0];

    const request = {
      uuid: 'request-uuid',
      route: { path: '/not-the-sandbox' },
      url: new URL('https://kibana.example.com/base/not-the-sandbox'),
    } as any;

    const toolkit = { next: jest.fn((args) => args ?? { type: 'next' }) } as any;
    onPreResponse(request, {} as any, toolkit);

    expect(toolkit.next).toHaveBeenCalledWith();
  });
});
