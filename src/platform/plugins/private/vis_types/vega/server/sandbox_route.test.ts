/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSandboxCsp, getImgSrcSourcesFromPolicy } from './sandbox_route';

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
