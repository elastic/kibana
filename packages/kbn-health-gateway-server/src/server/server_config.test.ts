/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './server_config';

describe('server config', () => {
  test('has defaults for config', () => {
    const configSchema = config.schema;
    const obj = {};
    expect(configSchema.validate(obj)).toEqual(
      expect.objectContaining({
        host: 'localhost',
        port: 3000,
      })
    );
  });

  describe('host', () => {
    const validHostnames = ['www.example.com', '8.8.8.8', '::1', 'localhost', '0.0.0.0'];
    const invalidHostnames = ['asdf$%^', '0'];

    test('accepts valid hostnames', () => {
      for (const val of validHostnames) {
        const { host } = config.schema.validate({ host: val });
        expect(host).toBe(val);
      }
    });

    test('throws if invalid hostname', () => {
      for (const host of invalidHostnames) {
        const configSchema = config.schema;
        expect(() => configSchema.validate({ host })).toThrowError(
          '[host]: value must be a valid hostname (see RFC 1123).'
        );
      }
    });
  });

  describe('port', () => {
    test('accepts valid ports', () => {
      const validPorts = [80, 3000, 5601];
      for (const val of validPorts) {
        const { port } = config.schema.validate({ port: val });
        expect(port).toBe(val);
      }
    });

    test('throws if invalid ports', () => {
      const configSchema = config.schema;
      expect(() => configSchema.validate({ port: false })).toThrowError(
        'port]: expected value of type [number] but got [boolean]'
      );
      expect(() => configSchema.validate({ port: 'oops' })).toThrowError(
        'port]: expected value of type [number] but got [string]'
      );
    });
  });
});
