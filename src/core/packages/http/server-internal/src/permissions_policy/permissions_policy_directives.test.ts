/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

import type { PermissionsPolicyConfigType } from './config';
import { permissionsPolicyConfig } from './config';
import { PermissionsPolicyDirectives } from './permissions_policy_directives';

/** The policy Kibana has sent since 8.x. Regenerating it byte for byte is the point of this class. */
const DEFAULT_POLICY =
  'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()';

const headers = (overrides: Record<string, unknown> = {}, reportTo?: string) =>
  PermissionsPolicyDirectives.fromConfig(
    permissionsPolicyConfig.schema.validate(overrides)
  ).getPermissionsPolicyHeadersByDisposition(reportTo);

describe('PermissionsPolicyDirectives', () => {
  describe('#fromConfig', () => {
    it('reproduces the default policy when nothing is configured', () => {
      expect(headers().enforceHeader).toEqual(DEFAULT_POLICY);
    });

    it('produces no report-only header when nothing is configured', () => {
      expect(headers().reportOnlyHeader).toEqual('');
    });

    it('adds configured values to the default for that directive', () => {
      expect(headers({ fullscreen: ['https://example.com'] }).enforceHeader).toContain(
        'fullscreen=(self "https://example.com")'
      );
    });

    it('leaves the other directives at their defaults', () => {
      expect(headers({ camera: ['self'] }).enforceHeader).toEqual(
        'camera=(self), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()'
      );
    });

    it('maps snake_case settings to their kebab-case directive names', () => {
      expect(headers({ display_capture: ['self'], web_share: ['self'] }).enforceHeader).toEqual(
        'camera=(), display-capture=(self), fullscreen=(self), geolocation=(), microphone=(), web-share=(self)'
      );
    });

    it('leaves bare tokens unquoted and double-quotes origins', () => {
      expect(headers({ camera: ['self', 'https://example.com'] }).enforceHeader).toContain(
        'camera=(self "https://example.com")'
      );
    });

    it('collapses an allowlist containing `*` to a bare wildcard', () => {
      expect(headers({ camera: ['self', '*'] }).enforceHeader).toContain('camera=*');
    });

    it('de-duplicates repeated values', () => {
      expect(headers({ fullscreen: ['self'] }).enforceHeader).toContain('fullscreen=(self)');
    });

    it('builds a report-only header from `report_only` configuration only', () => {
      const { enforceHeader, reportOnlyHeader } = headers({
        report_to: ['endpoint'],
        report_only: { camera: ['self'] },
      });
      expect(reportOnlyHeader).toEqual('camera=(self)');
      // The report-only policy must not leak into the enforced one.
      expect(enforceHeader).toEqual(DEFAULT_POLICY);
    });

    it('does not throw on a partial config object, as supplied by test mocks', () => {
      const partial = { report_to: [] } as unknown as PermissionsPolicyConfigType;
      expect(() =>
        PermissionsPolicyDirectives.fromConfig(partial).getPermissionsPolicyHeadersByDisposition()
      ).not.toThrow();
    });
  });

  describe('report-to parameter', () => {
    it('is attached to every directive, not only the last one', () => {
      expect(
        headers({ report_to: ['violations-endpoint'] }, 'violations-endpoint').enforceHeader
      ).toEqual(
        'camera=();report-to=violations-endpoint, display-capture=();report-to=violations-endpoint, fullscreen=(self);report-to=violations-endpoint, geolocation=();report-to=violations-endpoint, microphone=();report-to=violations-endpoint, web-share=();report-to=violations-endpoint'
      );
    });

    it('is omitted when no endpoint is configured', () => {
      expect(headers().enforceHeader).not.toContain('report-to');
    });

    it('is attached to report-only directives too', () => {
      expect(
        headers({ report_to: ['endpoint'], report_only: { camera: ['self'] } }, 'endpoint')
          .reportOnlyHeader
      ).toEqual('camera=(self);report-to=endpoint');
    });
  });

  describe('#addDirectiveValue', () => {
    it('appends to an existing directive without replacing it', () => {
      const directives = PermissionsPolicyDirectives.fromConfig(
        permissionsPolicyConfig.schema.validate({})
      );
      directives.addDirectiveValue('camera', 'https://example.com');
      expect(directives.getPermissionsPolicyHeadersByDisposition().enforceHeader).toContain(
        'camera=("https://example.com")'
      );
    });

    it('is idempotent for an already quoted value', () => {
      const directives = PermissionsPolicyDirectives.fromConfig(
        permissionsPolicyConfig.schema.validate({})
      );
      directives.addDirectiveValue('camera', '"https://example.com"');
      directives.addDirectiveValue('camera', 'https://example.com');
      expect(directives.getPermissionsPolicyHeadersByDisposition().enforceHeader).toContain(
        'camera=("https://example.com")'
      );
    });
  });
});
