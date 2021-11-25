/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './config';

describe('config.validate()', () => {
  it(`does not allow "disableEmbedding" to be set to true`, () => {
    // This is intentionally not editable in the raw CSP config.
    // Users should set `server.securityResponseHeaders.disableEmbedding` to control this config property.
    expect(() => config.schema.validate({ disableEmbedding: true })).toThrowError(
      '[disableEmbedding]: expected value to equal [false]'
    );
  });

  describe(`"script_src"`, () => {
    it(`throws if containing 'unsafe-inline' when 'strict' is true`, () => {
      expect(() =>
        config.schema.validate({
          strict: true,
          warnLegacyBrowsers: false,
          script_src: [`'self'`, `unsafe-inline`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"cannot use \`unsafe-inline\` for \`script_src\` when \`csp.strict\` is true"`
      );

      expect(() =>
        config.schema.validate({
          strict: true,
          warnLegacyBrowsers: false,
          script_src: [`'self'`, `'unsafe-inline'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"cannot use \`unsafe-inline\` for \`script_src\` when \`csp.strict\` is true"`
      );
    });

    it(`throws if containing 'unsafe-inline' when 'warnLegacyBrowsers' is true`, () => {
      expect(() =>
        config.schema.validate({
          strict: false,
          warnLegacyBrowsers: true,
          script_src: [`'self'`, `unsafe-inline`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"cannot use \`unsafe-inline\` for \`script_src\` when \`csp.warnLegacyBrowsers\` is true"`
      );

      expect(() =>
        config.schema.validate({
          strict: false,
          warnLegacyBrowsers: true,
          script_src: [`'self'`, `'unsafe-inline'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"cannot use \`unsafe-inline\` for \`script_src\` when \`csp.warnLegacyBrowsers\` is true"`
      );
    });

    it(`does not throw if containing 'unsafe-inline' when 'strict' and 'warnLegacyBrowsers' are false`, () => {
      expect(() =>
        config.schema.validate({
          strict: false,
          warnLegacyBrowsers: false,
          script_src: [`'self'`, `unsafe-inline`],
        })
      ).not.toThrow();

      expect(() =>
        config.schema.validate({
          strict: false,
          warnLegacyBrowsers: false,
          script_src: [`'self'`, `'unsafe-inline'`],
        })
      ).not.toThrow();
    });

    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          script_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[script_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          script_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[script_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          script_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[script_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"worker_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          worker_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[worker_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          worker_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[worker_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          worker_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[worker_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"style_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          style_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[style_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          style_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[style_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          style_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[style_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"connect_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          connect_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[connect_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          connect_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[connect_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          connect_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[connect_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"default_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          default_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[default_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          default_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[default_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          default_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[default_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"font_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          font_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[font_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          font_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[font_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          font_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[font_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"frame_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          frame_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          frame_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          frame_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"img_src"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          img_src: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[img_src]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          img_src: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[img_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          img_src: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[img_src]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });

  describe(`"frame_ancestors"`, () => {
    it('throws if using an `nonce-*` value', () => {
      expect(() =>
        config.schema.validate({
          frame_ancestors: [`hello`, `nonce-foo`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_ancestors]: using \\"nonce-*\\" is considered insecure and is not allowed"`
      );
    });

    it("throws if using `none` or `'none'`", () => {
      expect(() =>
        config.schema.validate({
          frame_ancestors: [`hello`, `none`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_ancestors]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );

      expect(() =>
        config.schema.validate({
          frame_ancestors: [`hello`, `'none'`],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[frame_ancestors]: using \\"none\\" would conflict with Kibana's default csp configuration and is not allowed"`
      );
    });
  });
});
