/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './kibana_config';

describe('kibana config', () => {
  test('has defaults for config', () => {
    const configSchema = config.schema;
    const obj = {};
    expect(configSchema.validate(obj)).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "http://localhost:5601",
        ],
      }
    `);
  });

  describe('hosts', () => {
    test('accepts valid hosts', () => {
      const configSchema = config.schema;
      const validHosts = ['http://some.host:1234', 'https://some.other.host'];
      expect(configSchema.validate({ hosts: validHosts })).toEqual({ hosts: validHosts });
    });

    test('throws if invalid hosts', () => {
      const invalidHosts = ['https://localhost:3000', 'abcxyz'];
      const configSchema = config.schema;
      expect(() => configSchema.validate({ hosts: invalidHosts })).toThrowError(
        '[hosts.1]: expected URI with scheme [http|https].'
      );
    });
  });
});
