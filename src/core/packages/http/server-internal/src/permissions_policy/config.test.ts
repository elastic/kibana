/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeprecatedConfigDetails } from '@kbn/config';
import { configDeprecationFactory } from '@kbn/config';
import {
  getReportingEndpoint,
  permissionsPolicyConfig,
  permissionsPolicyDirectiveSettings,
} from './config';

const validate = (value: Record<string, unknown>) => permissionsPolicyConfig.schema.validate(value);

// A reporting group name is serialized as a structured-field token. Anything outside that grammar
// terminates the `report-to` parameter, and the remainder is parsed as further members of the
// policy, which can grant a feature the policy is there to deny.
const INVALID_REPORTING_GROUP_NAMES = [
  ['a comma, which injects further policy members', 'violations, camera=*'],
  ['whitespace', 'violations endpoint'],
  ['a quote', 'violations"endpoint'],
  ['a semicolon', 'violations;camera=*'],
  ['a carriage return and line feed', 'violations\r\nX-Injected: 1'],
  ['an empty value', ''],
];

describe('permissionsPolicyConfig', () => {
  it('is registered at the `permissionsPolicy` root path', () => {
    expect(permissionsPolicyConfig.path).toEqual('permissionsPolicy');
  });

  it('defaults every directive to an empty list', () => {
    const config = validate({});
    expect(config.report_to).toEqual([]);
    expect(config.report_only).toBeUndefined();
    for (const setting of permissionsPolicyDirectiveSettings) {
      expect(config[setting]).toEqual([]);
    }
  });

  describe('directive values', () => {
    for (const setting of permissionsPolicyDirectiveSettings) {
      describe(setting, () => {
        it('accepts the bare tokens and an origin', () => {
          expect(
            validate({
              [setting]: ['self', '*', 'https://example.com', 'http://localhost:5601'],
            })[setting]
          ).toEqual(['self', '*', 'https://example.com', 'http://localhost:5601']);
        });

        it('rejects a value that would break structured-field parsing', () => {
          expect(() => validate({ [setting]: ['https://a.com, https://b.com'] })).toThrow(
            /cannot contain quotes, parentheses, commas, semicolons, or whitespace/
          );
        });

        it('rejects `none`, which is a Content Security Policy keyword', () => {
          expect(() => validate({ [setting]: ['none'] })).toThrow(/An empty list adds no sources/);
        });

        it('rejects `src`, which is valid only in an iframe allow attribute', () => {
          for (const value of ['src', `'src'`]) {
            expect(() => validate({ [setting]: [value] })).toThrow(
              /"src" is valid only in an iframe allow attribute/
            );
          }
        });

        it('rejects a non-origin value', () => {
          expect(() => validate({ [setting]: ['example.com'] })).toThrow(
            /must be self, \*, or an origin such as https:\/\/example.com/
          );
        });

        it('rejects a non-http protocol', () => {
          expect(() => validate({ [setting]: ['ftp://example.com'] })).toThrow(
            /must use the http or https protocol/
          );
        });

        it('rejects an origin carrying a path', () => {
          expect(() => validate({ [setting]: ['https://example.com/some/path'] })).toThrow(
            /must be an origin without a path, query, or fragment/
          );
        });

        it('rejects an origin carrying credentials', () => {
          for (const value of [
            'https://user:pass@example.com',
            'https://user@example.com',
            'https://:pass@example.com',
            'http://user:pass@localhost:5601',
          ]) {
            expect(() => validate({ [setting]: [value] })).toThrow(
              /must be an origin without a username or password/
            );
          }
        });

        it('rejects an empty value', () => {
          expect(() => validate({ [setting]: [''] })).toThrow(/an empty value is not allowed/);
        });

        // URL parsing decodes a percent-encoded host, so `%22` would become a quote that ends the
        // serialized string and injects `camera=*` as a policy member of its own.
        it.each([
          ['an encoded injection', 'https://a%22%29%2Ccamera=*%2Cx=%28%22b.com'],
          ['an encoded quote', 'https://a%22b.com'],
          ['a harmless encoding', 'https://exa%6Dple.com'],
        ])('rejects a percent-encoded origin: %s', (_, value) => {
          expect(() => validate({ [setting]: [value] })).toThrow(/cannot be percent-encoded/);
        });

        // IDNA maps fullwidth punctuation to ASCII, so this injects without any `%`. Only checking
        // the parsed origin catches it.
        it('rejects an origin that parses into characters that end the quoted string', () => {
          expect(() =>
            validate({
              [setting]: ['https://a\uFF02\uFF09\uFF0Ccamera=*\uFF0Cx=\uFF08\uFF02b.com'],
            })
          ).toThrow(/once parsed, which contains quotes/);
        });

        it('accepts an internationalized domain name, which parses to punycode', () => {
          expect(validate({ [setting]: ['https://b\u00FCcher.example'] })[setting]).toEqual([
            'https://b\u00FCcher.example',
          ]);
        });
      });
    }

    it('applies the same validation under `report_only`', () => {
      expect(() =>
        validate({ report_to: ['endpoint'], report_only: { camera: ['none'] } })
      ).toThrow(/An empty list adds no sources/);
    });
  });

  describe('enabled', () => {
    it('defaults to true', () => {
      expect(validate({}).enabled).toBe(true);
    });

    it('can be set to false on its own', () => {
      expect(validate({ enabled: false }).enabled).toBe(false);
    });

    it('rejects directives when false, because there is no header to add them to', () => {
      expect(() => validate({ enabled: false, camera: ['self'] })).toThrow(
        /cannot use `permissionsPolicy.<directive>` when `permissionsPolicy.enabled` is false/
      );
    });

    // `enabled` only switches off the enforced header. Cloud sets `report_to` on every hosted
    // deployment, so rejecting it here would stop those deployments from disabling the header.
    it('allows a reporting endpoint when false', () => {
      expect(() => validate({ enabled: false, report_to: ['endpoint'] })).not.toThrow();
    });

    it('allows report-only directives when false, because they control a separate header', () => {
      expect(() =>
        validate({ enabled: false, report_to: ['endpoint'], report_only: { camera: ['self'] } })
      ).not.toThrow();
    });
  });

  describe('report_to', () => {
    it('accepts a single endpoint', () => {
      expect(validate({ report_to: ['violations-endpoint'] }).report_to).toEqual([
        'violations-endpoint',
      ]);
    });

    it('still accepts more than one endpoint, which only ever used the first', () => {
      expect(validate({ report_to: ['one', 'two'] }).report_to).toEqual(['one', 'two']);
    });

    // A bad endpoint name only disables reporting, so it must not stop Kibana from starting. It is
    // dropped before serialization (see `getReportingEndpoint`) and a deprecation warns.
    it.each(INVALID_REPORTING_GROUP_NAMES)('accepts, without failing, %s', (_, value) => {
      expect(validate({ report_to: [value] }).report_to).toEqual([value]);
    });

    // `:` and `/` are legal in a structured-field token, so a URL passes the grammar. Kibana
    // cannot tell a mistyped endpoint from a group name, because the names are declared in the
    // free-form `server.customResponseHeaders.Reporting-Endpoints` header. A deprecation warns.
    it('accepts a URL, which is a valid token even though it is not a group name', () => {
      expect(validate({ report_to: ['https://example.com/reports'] }).report_to).toEqual([
        'https://example.com/reports',
      ]);
    });

    // `report_to` is GA. A long name still serializes correctly, so it must keep working.
    it('accepts a long endpoint name', () => {
      const name = 'a'.repeat(300);
      expect(validate({ report_to: [name] }).report_to).toEqual([name]);
    });
  });

  describe('deprecations', () => {
    const collect = (settings: Record<string, unknown>) => {
      const deprecations = permissionsPolicyConfig.deprecations!(configDeprecationFactory);
      const collected: DeprecatedConfigDetails[] = [];
      for (const deprecation of deprecations) {
        deprecation(
          { permissionsPolicy: settings },
          'permissionsPolicy',
          (details) => collected.push(details),
          { branch: 'main', version: '9.6.0', docLinks: {} as never }
        );
      }
      return collected;
    };

    it('emits nothing for the default configuration', () => {
      expect(collect({})).toEqual([]);
    });

    it('emits nothing for a single reporting endpoint', () => {
      expect(collect({ report_to: ['violations-endpoint'] })).toEqual([]);
    });

    it('warns, without failing, when more than one reporting endpoint is configured', () => {
      const [deprecation] = collect({ report_to: ['first', 'second'] });
      expect(deprecation.level).toEqual('warning');
      expect(deprecation.configPath).toEqual('permissionsPolicy.report_to');
      expect(deprecation.message).toContain('use only the first one, "first"');
    });

    it.each(['violations-endpoint', 'csp_reports.v2', '*'])(
      'emits nothing for an endpoint name that "Reporting-Endpoints" can declare: %s',
      (name) => {
        expect(collect({ report_to: [name] })).toEqual([]);
      }
    );

    // These are valid tokens, so Kibana starts and the header is intact, but "Reporting-Endpoints"
    // member names are lowercase structured-field keys, so no endpoint can ever match.
    it.each([
      ['an uppercase letter', 'Violations'],
      ['a character outside the key grammar', 'violations~endpoint'],
      ['a URL', 'https://example.com/reports'],
    ])('warns, without failing, when the endpoint name contains %s', (_, name) => {
      expect(() => validate({ report_to: [name] })).not.toThrow();
      const [deprecation] = collect({ report_to: [name] });
      expect(deprecation.level).toEqual('warning');
      expect(deprecation.configPath).toEqual('permissionsPolicy.report_to');
      expect(deprecation.message).toContain(`Browsers cannot match "${name}" to an endpoint`);
    });

    it('checks only the first endpoint, which is the one browsers use', () => {
      const deprecations = collect({ report_to: ['violations-endpoint', 'Second'] });
      expect(deprecations.map(({ title }) => title)).toEqual([
        'Setting "permissionsPolicy.report_to" accepts only one reporting endpoint',
      ]);
    });

    it.each(INVALID_REPORTING_GROUP_NAMES)(
      'warns that the endpoint is ignored when it contains %s',
      (_, name) => {
        const [deprecation] = collect({ report_to: [name] });
        expect(deprecation.level).toEqual('warning');
        expect(deprecation.configPath).toEqual('permissionsPolicy.report_to');
        expect(deprecation.title).toEqual('Setting "permissionsPolicy.report_to" is ignored');
        expect(deprecation.message).toContain('Kibana ignores it');
      }
    );

    it('warns about both an ignored first endpoint and the extra endpoints', () => {
      const deprecations = collect({ report_to: ['bad name', 'good'] });
      expect(deprecations.map(({ title }) => title)).toEqual([
        'Setting "permissionsPolicy.report_to" accepts only one reporting endpoint',
        'Setting "permissionsPolicy.report_to" is ignored',
      ]);
    });
  });

  describe('getReportingEndpoint', () => {
    it('returns nothing when no endpoint is configured', () => {
      expect(getReportingEndpoint(validate({}))).toBeUndefined();
    });

    it('returns the first endpoint', () => {
      expect(getReportingEndpoint(validate({ report_to: ['first', 'second'] }))).toEqual('first');
    });

    // A name that cannot match an endpoint still serializes safely, so it is sent as configured.
    it('returns a valid token even when it cannot match an endpoint', () => {
      expect(getReportingEndpoint(validate({ report_to: ['Violations'] }))).toEqual('Violations');
    });

    it.each(INVALID_REPORTING_GROUP_NAMES)('drops an endpoint with %s', (_, name) => {
      expect(getReportingEndpoint(validate({ report_to: [name] }))).toBeUndefined();
    });

    // Only the first endpoint was ever used, so a later valid one does not take its place.
    it('does not fall back to a later endpoint when the first is dropped', () => {
      expect(getReportingEndpoint(validate({ report_to: ['bad name', 'good'] }))).toBeUndefined();
    });
  });

  describe('report_only', () => {
    it('is accepted together with a reporting endpoint', () => {
      const config = validate({ report_to: ['endpoint'], report_only: { camera: ['self'] } });
      expect(config.report_only?.camera).toEqual(['self']);
    });

    it('is rejected without a reporting endpoint, because the header would never be sent', () => {
      expect(() => validate({ report_only: { camera: ['self'] } })).toThrow(
        /cannot use `permissionsPolicy.report_only` without `permissionsPolicy.report_to`/
      );
    });

    it('is accepted without a reporting endpoint when no directive is set', () => {
      expect(() => validate({ report_only: {} })).not.toThrow();
    });

    it('leaves an unset directive undefined, rather than defaulting it to an empty list', () => {
      const config = validate({ report_to: ['endpoint'], report_only: { camera: ['self'] } });
      expect(config.report_only?.fullscreen).toBeUndefined();
    });

    it('keeps an explicitly empty directive, which reports every use of the feature', () => {
      const config = validate({ report_to: ['endpoint'], report_only: { fullscreen: [] } });
      expect(config.report_only?.fullscreen).toEqual([]);
    });

    it('rejects an explicitly empty directive without a reporting endpoint', () => {
      expect(() => validate({ report_only: { fullscreen: [] } })).toThrow(
        /cannot use `permissionsPolicy.report_only` without `permissionsPolicy.report_to`/
      );
    });
  });
});
