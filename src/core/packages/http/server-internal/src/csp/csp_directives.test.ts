/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CspDirectives } from './csp_directives';
import { cspConfig } from './config';

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

    it(`removes 'none' from object_src when other values are added`, () => {
      const config = cspConfig.schema.validate({
        object_src: [`some-object_src-value`],
      });
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' some-object_src-value"`
      );
    });

    it('augments report-only directives when testing default-src none', () => {
      const config = cspConfig.schema.validate({
        img_src: ['img-src-value'],
      });
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeadersByDisposition()).toMatchInlineSnapshot(`
        Object {
          "enforceHeader": "script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'; img-src 'self' img-src-value",
          "reportOnlyHeader": "form-action 'report-sample' 'self'; default-src 'report-sample' 'none'; font-src 'report-sample' 'self'; img-src 'report-sample' 'self' data: tiles.maps.elastic.co img-src-value; connect-src 'report-sample' 'self' telemetry.elastic.co telemetry-staging.elastic.co feeds.elastic.co tiles.maps.elastic.co vector.maps.elastic.co; script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'",
        }
      `);
    });

    it('automatically adds single quotes for keywords', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('script-src', 'none');
      directives.addDirectiveValue('style-src', 'self');
      directives.addDirectiveValue('style-src', 'strict-dynamic');
      directives.addDirectiveValue('style-src', 'report-sample');
      directives.addDirectiveValue('style-src', 'unsafe-inline');
      directives.addDirectiveValue('style-src', 'unsafe-eval');
      directives.addDirectiveValue('style-src', 'unsafe-hashes');
      directives.addDirectiveValue('style-src', 'unsafe-allow-redirects');

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'none'; style-src 'self' 'strict-dynamic' 'report-sample' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'unsafe-allow-redirects'"`
      );
    });

    it('does not add single quotes for keywords when already present', () => {
      const directives = new CspDirectives();
      directives.addDirectiveValue('script-src', `'none'`);
      directives.addDirectiveValue('style-src', `'self'`);
      directives.addDirectiveValue('style-src', `'strict-dynamic'`);
      directives.addDirectiveValue('style-src', `'report-sample'`);
      directives.addDirectiveValue('style-src', `'unsafe-inline'`);
      directives.addDirectiveValue('style-src', `'unsafe-eval'`);
      directives.addDirectiveValue('style-src', `'unsafe-hashes'`);
      directives.addDirectiveValue('style-src', `'unsafe-allow-redirects'`);

      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'none'; style-src 'self' 'strict-dynamic' 'report-sample' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'unsafe-allow-redirects'"`
      );
    });
  });

  describe('#fromConfig', () => {
    it('returns the correct header for the default config', () => {
      const config = cspConfig.schema.validate({});
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'"`
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
        `"script-src 'report-sample' 'self' baz; worker-src 'report-sample' 'self' blob: foo; style-src 'report-sample' 'self' 'unsafe-inline' bar dolly; object-src 'report-sample' 'none'"`
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
        `"script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'; connect-src 'self' connect-src; default-src 'self' default-src; font-src 'self' font-src; frame-src 'self' frame-src; img-src 'self' img-src; frame-ancestors 'self' frame-ancestors; report-uri report-uri; report-to report-to"`
      );
    });

    it('adds single quotes for keywords in added directives', () => {
      const config = cspConfig.schema.validate({
        script_src: [`unsafe-hashes`],
      });
      const directives = CspDirectives.fromConfig(config);
      expect(directives.getCspHeader()).toMatchInlineSnapshot(
        `"script-src 'report-sample' 'self' 'unsafe-hashes'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'; object-src 'report-sample' 'none'"`
      );
    });

    it('merges additional CSP configs as expected', () => {
      const config = cspConfig.schema.validate({
        connect_src: ['*.foo.bar'], // should de-dupe these
      });
      const additionalConfig1 = {
        connect_src: ['*.foo.bar'],
        img_src: ['*.foo.bar'],
      };
      const additionalConfig2 = {
        connect_src: [`cdn.host.test`],
        font_src: [`cdn.host.test`],
        frame_src: [`cdn.host.test`],
        img_src: [`cdn.host.test`],
        worker_src: [`cdn.host.test`],
        script_src: [`cdn.host.test`],
        style_src: [`cdn.host.test`],
      };
      const directives = CspDirectives.fromConfig(config, additionalConfig1, additionalConfig2);
      expect(directives.getCspHeader()).toEqual(
        `script-src 'report-sample' 'self' cdn.host.test; worker-src 'report-sample' 'self' blob: cdn.host.test; style-src 'report-sample' 'self' 'unsafe-inline' cdn.host.test; object-src 'report-sample' 'none'; connect-src 'self' *.foo.bar cdn.host.test; font-src 'self' cdn.host.test; frame-src 'self' cdn.host.test; img-src 'self' *.foo.bar cdn.host.test`
      );
    });
  });
});
