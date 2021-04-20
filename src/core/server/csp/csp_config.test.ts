/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspConfig } from './csp_config';
import { FRAME_ANCESTORS_RULE } from './config';

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
        "disableEmbedding": false,
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
    expect(new CspConfig()).toEqual(CspConfig.DEFAULT);
  });

  describe('partial config', () => {
    test('allows "rules" to be set and changes header', () => {
      const rules = ['foo', 'bar'];
      const config = new CspConfig({ rules });
      expect(config.rules).toEqual(rules);
      expect(config.header).toMatchInlineSnapshot(`"foo; bar"`);
    });

    test('allows "strict" to be set', () => {
      const config = new CspConfig({ strict: false });
      expect(config.strict).toEqual(false);
      expect(config.strict).not.toEqual(CspConfig.DEFAULT.strict);
    });

    test('allows "warnLegacyBrowsers" to be set', () => {
      const warnLegacyBrowsers = false;
      const config = new CspConfig({ warnLegacyBrowsers });
      expect(config.warnLegacyBrowsers).toEqual(warnLegacyBrowsers);
      expect(config.warnLegacyBrowsers).not.toEqual(CspConfig.DEFAULT.warnLegacyBrowsers);
    });

    describe('allows "disableEmbedding" to be set', () => {
      const disableEmbedding = true;

      test('and changes rules/header if custom rules are not defined', () => {
        const config = new CspConfig({ disableEmbedding });
        expect(config.disableEmbedding).toEqual(disableEmbedding);
        expect(config.disableEmbedding).not.toEqual(CspConfig.DEFAULT.disableEmbedding);
        expect(config.rules).toEqual(expect.arrayContaining([FRAME_ANCESTORS_RULE]));
        expect(config.header).toMatchInlineSnapshot(
          `"script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'; frame-ancestors 'self'"`
        );
      });

      test('and does not change rules/header if custom rules are defined', () => {
        const rules = ['foo', 'bar'];
        const config = new CspConfig({ disableEmbedding, rules });
        expect(config.disableEmbedding).toEqual(disableEmbedding);
        expect(config.disableEmbedding).not.toEqual(CspConfig.DEFAULT.disableEmbedding);
        expect(config.rules).toEqual(rules);
        expect(config.header).toMatchInlineSnapshot(`"foo; bar"`);
      });
    });
  });
});
