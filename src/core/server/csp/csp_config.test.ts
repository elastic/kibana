/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspConfig } from './csp_config';
import { config as cspConfig, CspConfigType } from './config';

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
  let defaultConfig: CspConfigType;

  beforeEach(() => {
    defaultConfig = cspConfig.schema.validate({});
  });

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
    expect(new CspConfig(defaultConfig)).toEqual(CspConfig.DEFAULT);
  });

  describe('partial config', () => {
    test('allows "rules" to be set and changes header', () => {
      const rules = [`foo 'self'`, `bar 'self'`];
      const config = new CspConfig({ ...defaultConfig, rules });
      expect(config.rules).toEqual(rules);
      expect(config.header).toMatchInlineSnapshot(`"foo 'self'; bar 'self'"`);
    });

    test('allows "strict" to be set', () => {
      const config = new CspConfig({ ...defaultConfig, strict: false });
      expect(config.strict).toEqual(false);
      expect(config.strict).not.toEqual(CspConfig.DEFAULT.strict);
    });

    test('allows "warnLegacyBrowsers" to be set', () => {
      const warnLegacyBrowsers = false;
      const config = new CspConfig({ ...defaultConfig, warnLegacyBrowsers });
      expect(config.warnLegacyBrowsers).toEqual(warnLegacyBrowsers);
      expect(config.warnLegacyBrowsers).not.toEqual(CspConfig.DEFAULT.warnLegacyBrowsers);
    });

    test('allows "worker_src" to be set and changes header', () => {
      const config = new CspConfig({
        ...defaultConfig,
        rules: [],
        worker_src: ['foo', 'bar'],
      });
      expect(config.rules).toEqual([`worker-src foo bar`]);
      expect(config.header).toEqual(`worker-src foo bar`);
    });

    test('allows "style_src" to be set and changes header', () => {
      const config = new CspConfig({
        ...defaultConfig,
        rules: [],
        style_src: ['foo', 'bar'],
      });
      expect(config.rules).toEqual([`style-src foo bar`]);
      expect(config.header).toEqual(`style-src foo bar`);
    });

    test('allows "script_src" to be set and changes header', () => {
      const config = new CspConfig({
        ...defaultConfig,
        rules: [],
        script_src: ['foo', 'bar'],
      });
      expect(config.rules).toEqual([`script-src foo bar`]);
      expect(config.header).toEqual(`script-src foo bar`);
    });

    test('allows all directives to be set and changes header', () => {
      const config = new CspConfig({
        ...defaultConfig,
        rules: [],
        script_src: ['script', 'foo'],
        worker_src: ['worker', 'bar'],
        style_src: ['style', 'dolly'],
      });
      expect(config.rules).toEqual([
        `script-src script foo`,
        `worker-src worker bar`,
        `style-src style dolly`,
      ]);
      expect(config.header).toEqual(
        `script-src script foo; worker-src worker bar; style-src style dolly`
      );
    });

    test('applies defaults when `rules` is undefined', () => {
      const config = new CspConfig({
        ...defaultConfig,
        rules: undefined,
        script_src: ['script'],
        worker_src: ['worker'],
        style_src: ['style'],
      });
      expect(config.rules).toEqual([
        `script-src 'unsafe-eval' 'self' script`,
        `worker-src blob: 'self' worker`,
        `style-src 'unsafe-inline' 'self' style`,
      ]);
      expect(config.header).toEqual(
        `script-src 'unsafe-eval' 'self' script; worker-src blob: 'self' worker; style-src 'unsafe-inline' 'self' style`
      );
    });

    describe('allows "disableEmbedding" to be set', () => {
      const disableEmbedding = true;

      test('and changes rules/header if custom rules are not defined', () => {
        const config = new CspConfig({ ...defaultConfig, disableEmbedding });
        expect(config.disableEmbedding).toEqual(disableEmbedding);
        expect(config.disableEmbedding).not.toEqual(CspConfig.DEFAULT.disableEmbedding);
        expect(config.rules).toEqual(expect.arrayContaining([`frame-ancestors 'self'`]));
        expect(config.header).toMatchInlineSnapshot(
          `"script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'; frame-ancestors 'self'"`
        );
      });

      test('and does not change rules/header if custom rules are defined', () => {
        const rules = [`foo 'self'`, `bar 'self'`];
        const config = new CspConfig({ ...defaultConfig, disableEmbedding, rules });
        expect(config.disableEmbedding).toEqual(disableEmbedding);
        expect(config.disableEmbedding).not.toEqual(CspConfig.DEFAULT.disableEmbedding);
        expect(config.rules).toEqual(rules);
        expect(config.header).toMatchInlineSnapshot(`"foo 'self'; bar 'self'"`);
      });

      test('and overrides `frame-ancestors` if set', () => {
        const config = new CspConfig({
          ...defaultConfig,
          disableEmbedding: true,
          frame_ancestors: ['foo.com'],
        });
        expect(config.disableEmbedding).toEqual(disableEmbedding);
        expect(config.disableEmbedding).not.toEqual(CspConfig.DEFAULT.disableEmbedding);
        expect(config.header).toMatchInlineSnapshot(
          `"script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'; frame-ancestors 'self'"`
        );
      });
    });
  });
});
