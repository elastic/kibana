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

import type { DeprecatedConfigDetails } from '@kbn/config';
import { configDeprecationFactory } from '@kbn/config';
import { permissionsPolicyConfig, permissionsPolicyDirectiveSettings } from './config';

const validate = (value: Record<string, unknown>) => permissionsPolicyConfig.schema.validate(value);

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
              [setting]: ['self', 'src', '*', 'https://example.com', 'http://localhost:5601'],
            })[setting]
          ).toEqual(['self', 'src', '*', 'https://example.com', 'http://localhost:5601']);
        });

        it('rejects a value that would break structured-field parsing', () => {
          expect(() => validate({ [setting]: ['https://a.com, https://b.com'] })).toThrow(
            /cannot contain quotes, parentheses, commas, semicolons, or whitespace/
          );
        });

        it('rejects `none`, which is a Content Security Policy keyword', () => {
          expect(() => validate({ [setting]: ['none'] })).toThrow(
            /To deny a feature, leave its list empty/
          );
        });

        it('rejects a non-origin value', () => {
          expect(() => validate({ [setting]: ['example.com'] })).toThrow(
            /must be self, src, \*, or an origin such as https:\/\/example.com/
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

        it('rejects an empty value', () => {
          expect(() => validate({ [setting]: [''] })).toThrow(/an empty value is not allowed/);
        });
      });
    }

    it('applies the same validation under `report_only`', () => {
      expect(() =>
        validate({ report_to: ['endpoint'], report_only: { camera: ['none'] } })
      ).toThrow(/To deny a feature, leave its list empty/);
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
  });
});
