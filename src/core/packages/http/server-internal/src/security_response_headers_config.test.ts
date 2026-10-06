/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  securityResponseHeadersSchema as schema,
  parseRawSecurityResponseHeadersConfig as parse,
  validatePermissionsPolicyConfig as validate,
} from './security_response_headers_config';
import { permissionsPolicyConfig } from './permissions_policy';

const DEFAULT_POLICY =
  'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()';

const permissionsPolicy = (overrides: Record<string, unknown> = {}) =>
  permissionsPolicyConfig.schema.validate(overrides);

describe('parseRawSecurityResponseHeadersConfig', () => {
  it('returns default values', () => {
    const config = schema.validate({});
    const result = parse(config, permissionsPolicy());
    expect(result.disableEmbedding).toBe(false);
    expect(result.securityResponseHeaders).toMatchInlineSnapshot(`
      Object {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Permissions-Policy": "camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
      }
    `);
  });

  describe('strictTransportSecurity', () => {
    it('a custom value results in the expected Strict-Transport-Security header', () => {
      const strictTransportSecurity = 'max-age=31536000; includeSubDomains';
      const config = schema.validate({ strictTransportSecurity });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Strict-Transport-Security']).toEqual(
        strictTransportSecurity
      );
    });

    it('a null value removes the Strict-Transport-Security header', () => {
      const config = schema.validate({ strictTransportSecurity: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Strict-Transport-Security']).toBeUndefined();
    });
  });

  describe('xContentTypeOptions', () => {
    it('a custom value results in the expected X-Content-Type-Options header', () => {
      const xContentTypeOptions = 'nosniff'; // there is no other valid value to test with
      const config = schema.validate({ xContentTypeOptions });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['X-Content-Type-Options']).toEqual(xContentTypeOptions);
    });

    it('a null value removes the X-Content-Type-Options header', () => {
      const config = schema.validate({ xContentTypeOptions: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['X-Content-Type-Options']).toBeUndefined();
    });
  });

  describe('referrerPolicy', () => {
    it('a custom value results in the expected Referrer-Policy header', () => {
      const referrerPolicy = 'strict-origin-when-cross-origin';
      const config = schema.validate({ referrerPolicy });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Referrer-Policy']).toEqual(referrerPolicy);
    });

    it('a null value removes the Referrer-Policy header', () => {
      const config = schema.validate({ referrerPolicy: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Referrer-Policy']).toBeUndefined();
    });
  });

  describe('permissionsPolicy', () => {
    it("an unset value results in Kibana's default Permissions-Policy header", () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(DEFAULT_POLICY);
    });

    it('a custom value results in the expected Permissions-Policy header', () => {
      const config = schema.validate({ permissionsPolicy: 'display-capture=(self)' });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'display-capture=(self)'
      );
    });

    it('a null value removes the Permissions-Policy header', () => {
      const config = schema.validate({ permissionsPolicy: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Permissions-Policy']).toBeUndefined();
    });

    it('includes report-to directive if it is provided', () => {
      const config = schema.validate({ permissionsPolicy: 'display-capture=(self)' });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'display-capture=(self);report-to=violations-endpoint'
      );
    });

    it('adds per-directive configuration to the default policy', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ camera: ['self', 'https://example.com'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'camera=(self "https://example.com"), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()'
      );
    });

    it('attaches the report-to parameter to every directive', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'camera=();report-to=violations-endpoint, display-capture=();report-to=violations-endpoint, fullscreen=(self);report-to=violations-endpoint, geolocation=();report-to=violations-endpoint, microphone=();report-to=violations-endpoint, web-share=();report-to=violations-endpoint'
      );
    });

    it('collapses a wildcard allowlist to a bare token', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ fullscreen: ['*'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toContain('fullscreen=*');
    });
  });

  describe('permissionsPolicyReportOnly', () => {
    it('a custom value results in the expected Permissions-Policy-Report-Only header', () => {
      const config = schema.validate({ permissionsPolicyReportOnly: 'display-capture=(self)' });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toEqual(
        'display-capture=(self);report-to=violations-endpoint'
      );
    });

    it('includes Permissions-Policy-Report-Only only if report-to directive is set', () => {
      const config = schema.validate({ permissionsPolicy: 'display-capture=(self)' });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toBeUndefined();
    });

    it('builds the report-only header from per-directive configuration', () => {
      const config = schema.validate({});
      const result = parse(
        config,
        permissionsPolicy({
          report_to: ['violations-endpoint'],
          report_only: { camera: ['self'] },
        })
      );
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toEqual(
        'camera=(self);report-to=violations-endpoint'
      );
    });

    it('omits the report-only header when no report-only directive is configured', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toBeUndefined();
    });
  });

  describe('validatePermissionsPolicyConfig', () => {
    it('allows the legacy policy on its own', () => {
      expect(() =>
        validate(schema.validate({ permissionsPolicy: 'camera=()' }), permissionsPolicy())
      ).not.toThrow();
    });

    it('allows per-directive configuration on its own', () => {
      expect(() =>
        validate(schema.validate({}), permissionsPolicy({ camera: ['self'] }))
      ).not.toThrow();
    });

    it('rejects the legacy policy combined with a directive', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: 'camera=()' }),
          permissionsPolicy({ camera: ['self'] })
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"\\"server.securityResponseHeaders.permissionsPolicy\\" cannot be used together with \\"permissionsPolicy.<directive>\\". Remove \\"server.securityResponseHeaders.permissionsPolicy\\" and configure the individual directives instead."`
      );
    });

    it('rejects a null legacy policy combined with a directive', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: null }),
          permissionsPolicy({ camera: ['self'] })
        )
      ).toThrow(/cannot be used together with/);
    });

    it('rejects the legacy report-only policy combined with a report-only directive', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicyReportOnly: 'camera=()' }),
          permissionsPolicy({
            report_to: ['violations-endpoint'],
            report_only: { camera: ['self'] },
          })
        )
      ).toThrow(/permissionsPolicy\.report_only\.<directive>/);
    });

    it('allows the legacy enforce policy alongside report-only directives', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: 'camera=()' }),
          permissionsPolicy({
            report_to: ['violations-endpoint'],
            report_only: { camera: ['self'] },
          })
        )
      ).not.toThrow();
    });

    it('throws a CriticalError carrying the invalid-config exit code', () => {
      try {
        validate(
          schema.validate({ permissionsPolicy: 'camera=()' }),
          permissionsPolicy({ camera: ['self'] })
        );
        throw new Error('expected validate to throw');
      } catch (error) {
        expect(error.processExitCode).toBe(78);
      }
    });
  });

  describe('disableEmbedding', () => {
    it('a true value results in the expected X-Frame-Options header and expected disableEmbedding result value', () => {
      const config = schema.validate({ disableEmbedding: true });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['X-Frame-Options']).toMatchInlineSnapshot(
        `"SAMEORIGIN"`
      );
      expect(result.disableEmbedding).toBe(true);
    });
  });

  describe('crossOriginOpenerPolicy', () => {
    it('a custom value results in the expected Cross-Origin-Opener-Policy header', () => {
      const crossOriginOpenerPolicy = 'same-origin-allow-popups';
      const config = schema.validate({ crossOriginOpenerPolicy });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Cross-Origin-Opener-Policy']).toEqual(
        crossOriginOpenerPolicy
      );
    });

    it('a null value removes the Cross-Origin-Opener-Policy header', () => {
      const config = schema.validate({ crossOriginOpenerPolicy: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Cross-Origin-Opener-Policy']).toBeUndefined();
    });
  });
});
