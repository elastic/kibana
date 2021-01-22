/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CspConfig } from '.';

// CSP rules aren't strictly additive, so any change can potentially expand or
// restrict the policy in a way we consider a breaking change. For that reason,
// we test the default rules exactly so any change to those rules gets flagged
// for manual review. In other words, this test is intentionally fragile to draw
// extra attention if defaults are modified in any way.
//
// A test failure here does not necessarily mean this change cannot be made,
// but any change here should undergo sufficient scrutiny by the Kibana
// security team.
//
// The tests use inline snapshots to make it as easy as possible to identify
// the nature of a change in defaults during a PR review.

describe('CspConfig', () => {
  test('DEFAULT', () => {
    expect(CspConfig.DEFAULT).toMatchInlineSnapshot(`
      CspConfig {
        "header": "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
        "rules": Array [
          "script-src 'unsafe-eval' 'self'",
          "worker-src blob: 'self'",
          "style-src 'unsafe-inline' 'self'",
        ],
        "strict": true,
        "warnLegacyBrowsers": true,
      }
    `);
  });

  test('defaults from config', () => {
    expect(new CspConfig()).toMatchInlineSnapshot(`
      CspConfig {
        "header": "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
        "rules": Array [
          "script-src 'unsafe-eval' 'self'",
          "worker-src blob: 'self'",
          "style-src 'unsafe-inline' 'self'",
        ],
        "strict": true,
        "warnLegacyBrowsers": true,
      }
    `);
  });

  test('creates from partial config', () => {
    expect(new CspConfig({ strict: false, warnLegacyBrowsers: false })).toMatchInlineSnapshot(`
      CspConfig {
        "header": "script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'",
        "rules": Array [
          "script-src 'unsafe-eval' 'self'",
          "worker-src blob: 'self'",
          "style-src 'unsafe-inline' 'self'",
        ],
        "strict": false,
        "warnLegacyBrowsers": false,
      }
    `);
  });

  test('computes header from rules', () => {
    const cspConfig = new CspConfig({ rules: ['alpha', 'beta', 'gamma'] });

    expect(cspConfig).toMatchInlineSnapshot(`
      CspConfig {
        "header": "alpha; beta; gamma",
        "rules": Array [
          "alpha",
          "beta",
          "gamma",
        ],
        "strict": true,
        "warnLegacyBrowsers": true,
      }
    `);
  });
});
