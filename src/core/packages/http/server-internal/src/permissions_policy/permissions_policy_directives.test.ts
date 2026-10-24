/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateHeaderValue } from 'http';
import type { PermissionsPolicyConfigType } from './config';
import { permissionsPolicyConfig } from './config';
import { PermissionsPolicyDirectives } from './permissions_policy_directives';

/** The policy Kibana has sent since 8.x. Regenerating it byte for byte is the point of this class. */
const DEFAULT_POLICY =
  'camera=(), display-capture=(), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=()';

const headers = (overrides: Record<string, unknown> = {}, reportTo?: string) =>
  PermissionsPolicyDirectives.fromConfig(
    permissionsPolicyConfig.schema.validate(overrides)
  ).getPermissionsPolicyHeadersByDisposition(reportTo);

/**
 * Splits a header into its top-level members, honouring inner lists and quoted strings, the way a
 * structured-field parser would. Returns `undefined` when quotes or lists are unbalanced, which
 * makes a browser discard the whole header.
 */
const topLevelMembers = (header: string) => {
  const members: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < header.length; i++) {
    const char = header[i];
    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      members.push(header.slice(start, i).trim());
      start = i + 1;
    }
  }
  members.push(header.slice(start).trim());
  return inString || depth !== 0 ? undefined : members;
};

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
        'fullscreen=(self "https://play.vidyard.com" "https://example.com")'
      );
    });

    it('leaves the other directives at their defaults', () => {
      expect(headers({ camera: ['self'] }).enforceHeader).toEqual(
        'camera=(self), display-capture=(), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=()'
      );
    });

    it('maps snake_case settings to their kebab-case directive names', () => {
      expect(headers({ display_capture: ['self'], web_share: ['self'] }).enforceHeader).toEqual(
        'camera=(), display-capture=(self), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=(self)'
      );
    });

    it('leaves bare tokens unquoted and double-quotes origins', () => {
      expect(headers({ camera: ['self', 'https://example.com'] }).enforceHeader).toContain(
        'camera=(self "https://example.com")'
      );
    });

    it('serializes an internationalized origin as ASCII, so it is a valid header value', () => {
      const { enforceHeader } = headers({ camera: ['https://例え.テスト'] });
      expect(enforceHeader).toContain('camera=("https://xn--r8jz45g.xn--zckzah")');
      expect(() => validateHeaderValue('Permissions-Policy', enforceHeader)).not.toThrow();
    });

    it('serializes an origin in its canonical form', () => {
      expect(headers({ camera: ['https://Example.COM:443/'] }).enforceHeader).toContain(
        'camera=("https://example.com")'
      );
    });

    it('collapses an allowlist containing `*` to a bare wildcard', () => {
      expect(headers({ camera: ['self', '*'] }).enforceHeader).toContain('camera=*');
    });

    it('de-duplicates repeated values', () => {
      expect(headers({ fullscreen: ['self'] }).enforceHeader).toContain(
        'fullscreen=(self "https://play.vidyard.com")'
      );
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

    it('keeps an explicitly empty report-only directive, which reports every use', () => {
      expect(
        headers({ report_to: ['endpoint'], report_only: { fullscreen: [] } }).reportOnlyHeader
      ).toEqual('fullscreen=()');
    });

    it('does not throw on a partial config object, as supplied by test mocks', () => {
      const partial = { report_to: [] } as unknown as PermissionsPolicyConfigType;
      expect(() =>
        PermissionsPolicyDirectives.fromConfig(partial).getPermissionsPolicyHeadersByDisposition()
      ).not.toThrow();
    });
  });

  // Whatever validation accepts must serialize to the same six directives, so that no value can add
  // a member of its own or unbalance the header.
  describe('serializing any accepted value', () => {
    const candidates = [
      'self',
      '*',
      'https://example.com',
      'HTTPS://EXAMPLE.COM:8443/',
      'http://[::1]:5601',
      'https://*.example.com',
      'https://b\u00FCcher.example',
      'https://a%22%29%2Ccamera=*%2Cx=%28%22b.com',
      'https://a%22b.com',
      'https://a\uFF02\uFF09\uFF0Ccamera=*\uFF0Cx=\uFF08\uFF02b.com',
      'https://a\uFF1Bb.com',
      'https://a\uFF3Cb.com',
    ];

    it.each(candidates)('keeps six directives for %s', (value) => {
      let config;
      try {
        config = permissionsPolicyConfig.schema.validate({ camera: [value] });
      } catch {
        return; // Rejected values never reach the serializer.
      }
      const members = topLevelMembers(
        PermissionsPolicyDirectives.fromConfig(config).getPermissionsPolicyHeadersByDisposition()
          .enforceHeader
      );
      expect(members?.map((member) => member.split('=')[0])).toEqual([
        'camera',
        'display-capture',
        'fullscreen',
        'geolocation',
        'microphone',
        'web-share',
      ]);
    });
  });

  describe('report-to parameter', () => {
    it('is attached to every directive, not only the last one', () => {
      expect(
        headers({ report_to: ['violations-endpoint'] }, 'violations-endpoint').enforceHeader
      ).toEqual(
        'camera=();report-to=violations-endpoint, display-capture=();report-to=violations-endpoint, fullscreen=(self "https://play.vidyard.com");report-to=violations-endpoint, geolocation=(self);report-to=violations-endpoint, microphone=();report-to=violations-endpoint, web-share=();report-to=violations-endpoint'
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

    it('is attached to an explicitly empty report-only directive', () => {
      expect(
        headers({ report_to: ['endpoint'], report_only: { fullscreen: [] } }, 'endpoint')
          .reportOnlyHeader
      ).toEqual('fullscreen=();report-to=endpoint');
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
