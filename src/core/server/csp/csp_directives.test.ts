/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CspDirectives } from './csp_directives';
import { config as cspConfig } from './config';

describe('CspDirectives', () => {
  describe('#addDirectiveValue', () => {
    it('properly updates the header', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('style-src', 'foo');
      expect(directives.getCspHeader()).toMatchInlineSnapshot(`"style-src foo"`);

      directives.addDirectiveValue('style-src', 'bar');
      expect(directives.getCspHeader()).toMatchInlineSnapshot(`"style-src foo bar"`);
    });

    it('handles distinct directives', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('style-src', 'foo');
      directives.addDirectiveValue('style-src', 'bar');
      directives.addDirectiveValue('worker-src', 'dolly');

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"style-src foo bar; worker-src dolly"`
      );
    });

    it('removes duplicates', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('style-src', 'foo');
      directives.addDirectiveValue('style-src', 'foo');
      directives.addDirectiveValue('style-src', 'bar');

      expect(directives.getCspHeader()).toMatchInlineSnapshot(`"style-src foo bar"`);
    });

    it('automatically adds single quotes for keywords', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('style-src', 'none');
      directives.addDirectiveValue('style-src', 'self');
      directives.addDirectiveValue('style-src', 'strict-dynamic');
      directives.addDirectiveValue('style-src', 'report-sample');
      directives.addDirectiveValue('style-src', 'unsafe-inline');
      directives.addDirectiveValue('style-src', 'unsafe-eval');
      directives.addDirectiveValue('style-src', 'unsafe-hashes');
      directives.addDirectiveValue('style-src', 'unsafe-allow-redirects');

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"style-src 'none' 'self' 'strict-dynamic' 'report-sample' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'unsafe-allow-redirects'"`
      );
    });

    it('does not add single quotes for keywords when already present', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('style-src', `'none'`);
      directives.addDirectiveValue('style-src', `'self'`);
      directives.addDirectiveValue('style-src', `'strict-dynamic'`);
      directives.addDirectiveValue('style-src', `'report-sample'`);
      directives.addDirectiveValue('style-src', `'unsafe-inline'`);
      directives.addDirectiveValue('style-src', `'unsafe-eval'`);
      directives.addDirectiveValue('style-src', `'unsafe-hashes'`);
      directives.addDirectiveValue('style-src', `'unsafe-allow-redirects'`);

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"style-src 'none' 'self' 'strict-dynamic' 'report-sample' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'unsafe-allow-redirects'"`
      );
    });
  });

  describe('#fromConfig', () => {
    it('returns the correct header for the default config', () => {
      const config = cspConfig.schema.validate({});
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'"`
      );
    });

    it('adds default value for config with directives', () => {
      const config = cspConfig.schema.validate({
        script_src: [`baz`],
        worker_src: [`foo`],
        style_src: [`bar`, `dolly`],
      });
      const directives = CspDirectives.fromConfig(config);

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'unsafe-eval' 'self' baz; worker-src blob: 'self' foo; style-src 'unsafe-inline' 'self' bar dolly"`
      );
    });

    it('adds additional values for some directives without defaults', () => {
      const config = cspConfig.schema.validate({
        connect_src: [`connect-src`],
        default_src: [`default-src`],
        font_src: [`font-src`],
        frame_src: [`frame-src`],
        img_src: [`img-src`],
        frame_ancestors: [`frame-ancestors`],
        report_uri: [`report-uri`],
        report_to: [`report-to`],
      });
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'; connect-src 'self' connect-src; default-src 'self' default-src; font-src 'self' font-src; frame-src 'self' frame-src; img-src 'self' img-src; frame-ancestors 'self' frame-ancestors; report-uri report-uri; report-to report-to"`
      );
    });

    it('adds single quotes for keywords in added directives', () => {
      const config = cspConfig.schema.validate({
        script_src: [`unsafe-hashes`],
      });
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'unsafe-eval' 'self' 'unsafe-hashes'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'"`
      );
    });
  });
});
