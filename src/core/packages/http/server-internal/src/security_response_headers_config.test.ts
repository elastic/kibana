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
  'camera=(), display-capture=(), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=()';

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
        "Permissions-Policy": "camera=(), display-capture=(), fullscreen=(self \\"https://play.vidyard.com\\"), geolocation=(self), microphone=(), web-share=()",
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

    // Without these, Maps' browser location, the Canvas `location()` function and the fullscreen
    // toggle on Security Solution's embedded Vidyard videos are blocked by Kibana's own policy.
    it('allows the features that Kibana itself uses by default', () => {
      const result = parse(schema.validate({}), permissionsPolicy());
      const policy = result.securityResponseHeaders['Permissions-Policy'];
      expect(policy).toContain('geolocation=(self)');
      expect(policy).toContain('fullscreen=(self "https://play.vidyard.com")');
      expect(policy).toContain('camera=()');
    });

    it('a null value removes the Permissions-Policy header', () => {
      const config = schema.validate({ permissionsPolicy: null });
      const result = parse(config, permissionsPolicy());
      expect(result.securityResponseHeaders['Permissions-Policy']).toBeUndefined();
    });

    it('an empty value sends no Permissions-Policy header', () => {
      const config = schema.validate({ permissionsPolicy: '' });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
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
        'camera=(self "https://example.com"), display-capture=(), fullscreen=(self "https://play.vidyard.com"), geolocation=(self), microphone=(), web-share=()'
      );
    });

    // `report-to` belongs to each directive. Appended once to the end, it only covered `web-share`,
    // and browsers dropped violations of every other directive.
    it('attaches the report-to parameter to every directive', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'camera=();report-to=violations-endpoint, display-capture=();report-to=violations-endpoint, fullscreen=(self "https://play.vidyard.com");report-to=violations-endpoint, geolocation=(self);report-to=violations-endpoint, microphone=();report-to=violations-endpoint, web-share=();report-to=violations-endpoint'
      );
    });

    it('collapses a wildcard allowlist to a bare token', () => {
      const config = schema.validate({});
      const result = parse(config, permissionsPolicy({ fullscreen: ['*'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toContain('fullscreen=*');
    });

    it('uses only the first reporting endpoint', () => {
      const config = schema.validate({ permissionsPolicy: 'camera=(), microphone=()' });
      const result = parse(config, permissionsPolicy({ report_to: ['first', 'second'] }));
      // The whole list used to be interpolated, which serialized as `report-to=first,second` and
      // turned `second` into a member of the policy.
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'camera=();report-to=first, microphone=();report-to=first'
      );
    });

    // A `report-to` inside the inner list belongs to an origin, not to the directive, so the
    // directive still gets its own.
    it('attaches report-to to a directive whose inner list carries one', () => {
      const config = schema.validate({
        permissionsPolicy: 'geolocation=("https://other.example";report-to=ignored)',
      });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(
        'geolocation=("https://other.example";report-to=ignored);report-to=violations-endpoint'
      );
    });
  });

  describe('permissionsPolicy.enabled', () => {
    it('false sends no Permissions-Policy header', () => {
      const result = parse(schema.validate({}), permissionsPolicy({ enabled: false }));
      expect(result.securityResponseHeaders['Permissions-Policy']).toBeUndefined();
    });

    it('false leaves the Permissions-Policy-Report-Only header alone', () => {
      const result = parse(
        schema.validate({}),
        permissionsPolicy({
          enabled: false,
          report_to: ['violations-endpoint'],
          report_only: { camera: ['self'] },
        })
      );
      expect(result.securityResponseHeaders['Permissions-Policy']).toBeUndefined();
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toEqual(
        'camera=(self);report-to=violations-endpoint'
      );
    });

    it('false leaves the deprecated report-only policy alone too', () => {
      const result = parse(
        schema.validate({ permissionsPolicyReportOnly: 'camera=()' }),
        permissionsPolicy({ enabled: false, report_to: ['violations-endpoint'] })
      );
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toEqual(
        'camera=();report-to=violations-endpoint'
      );
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

    it('an empty value sends no Permissions-Policy-Report-Only header', () => {
      const config = schema.validate({ permissionsPolicyReportOnly: '' });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toBeUndefined();
    });

    it('attaches report-to to every directive of the report-only policy', () => {
      const config = schema.validate({ permissionsPolicyReportOnly: 'camera=(), microphone=()' });
      const result = parse(config, permissionsPolicy({ report_to: ['violations-endpoint'] }));
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toEqual(
        'camera=();report-to=violations-endpoint, microphone=();report-to=violations-endpoint'
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

  // An endpoint name outside the token grammar would end the `report-to` parameter and inject
  // `camera=*` as a further member, so it is dropped and never reaches a header.
  describe('an invalid report_to', () => {
    const INJECTING_REPORT_TO = ['violations, camera=*'];

    it('is left out of the built Permissions-Policy header', () => {
      const result = parse(
        schema.validate({}),
        permissionsPolicy({ report_to: INJECTING_REPORT_TO })
      );
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual(DEFAULT_POLICY);
    });

    it('is left out of the deprecated Permissions-Policy string', () => {
      const result = parse(
        schema.validate({ permissionsPolicy: 'camera=()' }),
        permissionsPolicy({ report_to: INJECTING_REPORT_TO })
      );
      expect(result.securityResponseHeaders['Permissions-Policy']).toEqual('camera=()');
    });

    it('sends no built Permissions-Policy-Report-Only header', () => {
      const result = parse(
        schema.validate({}),
        permissionsPolicy({ report_to: INJECTING_REPORT_TO, report_only: { camera: [] } })
      );
      expect(result.securityResponseHeaders['Permissions-Policy-Report-Only']).toBeUndefined();
    });

    it('sends no deprecated Permissions-Policy-Report-Only string', () => {
      const result = parse(
        schema.validate({ permissionsPolicyReportOnly: 'camera=()' }),
        permissionsPolicy({ report_to: INJECTING_REPORT_TO })
      );
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

    it('rejects a null legacy policy combined with a directive, and says why', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: null }),
          permissionsPolicy({ camera: ['self'] })
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"\\"server.securityResponseHeaders.permissionsPolicy\\" is set to null, which disables the header, so it cannot be used together with \\"permissionsPolicy.<directive>\\", which adds to it. Remove one of them."`
      );
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

    it('rejects the legacy report-only policy combined with an explicitly empty report-only directive', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicyReportOnly: 'camera=()' }),
          permissionsPolicy({
            report_to: ['violations-endpoint'],
            report_only: { fullscreen: [] },
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

    it('rejects the legacy policy string when the header is disabled', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: 'camera=()' }),
          permissionsPolicy({ enabled: false })
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"\\"server.securityResponseHeaders.permissionsPolicy\\" sets a policy, but \\"permissionsPolicy.enabled\\" is false, which disables the header. Remove \\"server.securityResponseHeaders.permissionsPolicy\\"."`
      );
    });

    // Both mean the header is not sent, so a deployment can migrate one step at a time.
    it('allows a null legacy policy when the header is disabled', () => {
      expect(() =>
        validate(
          schema.validate({ permissionsPolicy: null }),
          permissionsPolicy({ enabled: false })
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
