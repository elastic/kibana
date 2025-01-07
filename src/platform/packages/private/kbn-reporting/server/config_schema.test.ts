/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema } from './config_schema';

describe('Reporting Config Schema', () => {
  it(`context {"dev":false,"dist":false} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: false })).toMatchSnapshot();
  });

  it(`context {"dev":false,"dist":true} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: true })).toMatchSnapshot();
  });

  it('allows ByteSizeValue values for certain keys', () => {
    expect(ConfigSchema.validate({ csv: { maxSizeBytes: '12mb' } }).csv.maxSizeBytes)
      .toMatchInlineSnapshot(`
      ByteSizeValue {
        "valueInBytes": 12582912,
      }
    `);
  });

  it(`allows optional settings`, () => {
    // encryption key
    expect(
      ConfigSchema.validate({ encryptionKey: 'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq' })
        .encryptionKey
    ).toBe('qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');

    expect(ConfigSchema.validate({ encryptionKey: 'weaksauce' }).encryptionKey).toBe('weaksauce');
    // kibanaServer
    expect(
      ConfigSchema.validate({ kibanaServer: { hostname: 'Frodo' } }).kibanaServer
    ).toMatchObject({ hostname: 'Frodo' });
  });

  it.each(['0', '0.0', '0.0.0'])(
    `fails to validate "kibanaServer.hostname" with an invalid hostname: "%s"`,
    (address) => {
      expect(() =>
        ConfigSchema.validate({
          kibanaServer: { hostname: address },
        })
      ).toThrowError(`[kibanaServer.hostname]: value must be a valid hostname (see RFC 1123).`);
    }
  );

  it.each(['0.0.0.0', '0000:0000:0000:0000:0000:0000:0000:0000', '::'])(
    `fails to validate "kibanaServer.hostname" hostname as zero: "%s"`,
    (address) => {
      expect(() =>
        ConfigSchema.validate({
          kibanaServer: { hostname: address },
        })
      ).toThrowError(
        `[kibanaServer.hostname]: cannot use '0.0.0.0' as Kibana host name, consider using the default (localhost) instead`
      );
    }
  );

  it('permits csv with serverless', () => {
    expect(() =>
      ConfigSchema.validate({ export_types: { pdf: { enabled: true } } }, { dev: true })
    ).not.toThrow();
  });

  it('enables all export types by default', () => {
    expect(ConfigSchema.validate({}, { serverless: false }).export_types).toMatchInlineSnapshot(`
        Object {
          "csv": Object {
            "enabled": true,
          },
          "pdf": Object {
            "enabled": true,
          },
          "png": Object {
            "enabled": true,
          },
        }
      `);
  });

  it('disables ilm settings in serverless', () => {
    expect(ConfigSchema.validate({}, { serverless: true }).statefulSettings).toMatchInlineSnapshot(`
      Object {
        "enabled": false,
      }
    `);
  });

  it('disables screenshot type exports in serverless', () => {
    expect(ConfigSchema.validate({}, { serverless: true }).export_types).toMatchInlineSnapshot(`
        Object {
          "csv": Object {
            "enabled": true,
          },
          "pdf": Object {
            "enabled": false,
          },
          "png": Object {
            "enabled": false,
          },
        }
      `);
  });

  it('it should allow image reporting for any non-serverless config', () => {
    expect(() =>
      ConfigSchema.validate({ export_types: { pdf: { enabled: true } } }, { dev: true })
    ).not.toThrow();
    expect(() =>
      ConfigSchema.validate({ export_types: { png: { enabled: true } } }, { dev: true })
    ).not.toThrow();
    expect(() =>
      ConfigSchema.validate({ export_types: { csv: { enabled: true } } }, { dev: true })
    ).not.toThrow();
  });
});
