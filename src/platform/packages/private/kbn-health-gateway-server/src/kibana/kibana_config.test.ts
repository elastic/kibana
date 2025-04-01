/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { config } from './kibana_config';

describe('kibana config', () => {
  test('has defaults for config', () => {
    const configSchema = config.schema;
    const obj = {
      hosts: ['http://localhost:5601'],
    };
    expect(configSchema.validate(obj)).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "http://localhost:5601",
        ],
        "requestTimeout": "PT30S",
        "ssl": Object {
          "verificationMode": "full",
        },
      }
    `);
  });

  describe('hosts', () => {
    test('accepts valid hosts', () => {
      const configSchema = config.schema;
      const validHosts = ['http://some.host:1234', 'https://some.other.host'];
      expect(configSchema.validate({ hosts: validHosts })).toEqual(
        expect.objectContaining({ hosts: validHosts })
      );
    });

    test('throws if invalid hosts', () => {
      const invalidHosts = ['https://localhost:3000', 'abcxyz'];
      const configSchema = config.schema;
      expect(() => configSchema.validate({ hosts: invalidHosts })).toThrowError(
        '[hosts.1]: expected URI with scheme [http|https].'
      );
    });
  });

  describe('ssl', () => {
    test('accepts valid ssl config', () => {
      const configSchema = config.schema;
      const valid = {
        certificate: '/herp/derp',
        certificateAuthorities: ['/beep/boop'],
        verificationMode: 'certificate',
      };
      expect(
        configSchema.validate({
          hosts: ['http://localhost:5601'],
          ssl: valid,
        })
      ).toEqual(expect.objectContaining({ ssl: valid }));
    });

    test('throws if invalid ssl config', () => {
      const configSchema = config.schema;
      const hosts = ['http://localhost:5601'];
      const invalid = {
        verificationMode: 'nope',
      };
      expect(() => configSchema.validate({ hosts, ssl: invalid }))
        .toThrowErrorMatchingInlineSnapshot(`
        "[ssl.verificationMode]: types that failed validation:
        - [ssl.verificationMode.0]: expected value to equal [none]
        - [ssl.verificationMode.1]: expected value to equal [certificate]
        - [ssl.verificationMode.2]: expected value to equal [full]"
      `);
    });
  });
});
