/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { config, ServerConfig } from './server_config';

describe('server config', () => {
  test('has defaults for config', () => {
    const configSchema = config.schema;
    const obj = {};
    expect(configSchema.validate(obj)).toMatchInlineSnapshot(`
      Object {
        "host": "localhost",
        "keepaliveTimeout": 120000,
        "maxPayload": ByteSizeValue {
          "valueInBytes": 1048576,
        },
        "payloadTimeout": 20000,
        "port": 3000,
        "restrictInternalApis": true,
        "shutdownTimeout": "PT30S",
        "socketTimeout": 120000,
        "ssl": Object {
          "cipherSuites": Array [
            "TLS_AES_256_GCM_SHA384",
            "TLS_CHACHA20_POLY1305_SHA256",
            "TLS_AES_128_GCM_SHA256",
            "ECDHE-RSA-AES128-GCM-SHA256",
            "ECDHE-ECDSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-ECDSA-AES256-GCM-SHA384",
            "DHE-RSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES128-SHA256",
            "DHE-RSA-AES128-SHA256",
            "ECDHE-RSA-AES256-SHA384",
            "DHE-RSA-AES256-SHA384",
            "ECDHE-RSA-AES256-SHA256",
            "DHE-RSA-AES256-SHA256",
            "HIGH",
            "!aNULL",
            "!eNULL",
            "!EXPORT",
            "!DES",
            "!RC4",
            "!MD5",
            "!PSK",
            "!SRP",
            "!CAMELLIA",
          ],
          "clientAuthentication": "none",
          "enabled": false,
          "keystore": Object {},
          "supportedProtocols": Array [
            "TLSv1.1",
            "TLSv1.2",
            "TLSv1.3",
          ],
          "truststore": Object {},
        },
      }
    `);
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

  describe('maxPayload', () => {
    test('can specify max payload as string', () => {
      const obj = {
        maxPayload: '2mb',
      };
      const configValue = config.schema.validate(obj);
      expect(configValue.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
    });
  });

  describe('shutdownTimeout', () => {
    test('can specify a valid shutdownTimeout', () => {
      const configValue = config.schema.validate({ shutdownTimeout: '5s' });
      expect(configValue.shutdownTimeout.asMilliseconds()).toBe(5000);
    });

    test('can specify a valid shutdownTimeout (lower-edge of 1 second)', () => {
      const configValue = config.schema.validate({ shutdownTimeout: '1s' });
      expect(configValue.shutdownTimeout.asMilliseconds()).toBe(1000);
    });

    test('can specify a valid shutdownTimeout (upper-edge of 2 minutes)', () => {
      const configValue = config.schema.validate({ shutdownTimeout: '2m' });
      expect(configValue.shutdownTimeout.asMilliseconds()).toBe(120000);
    });

    test('should error if below 1s', () => {
      expect(() => config.schema.validate({ shutdownTimeout: '100ms' })).toThrow(
        '[shutdownTimeout]: the value should be between 1 second and 2 minutes'
      );
    });

    test('should error if over 2 minutes', () => {
      expect(() => config.schema.validate({ shutdownTimeout: '3m' })).toThrow(
        '[shutdownTimeout]: the value should be between 1 second and 2 minutes'
      );
    });
  });

  describe('with TLS', () => {
    test('throws if TLS is enabled but `redirectHttpFromPort` is equal to `port`', () => {
      const configSchema = config.schema;
      const obj = {
        port: 1234,
        ssl: {
          certificate: '/path/to/certificate',
          enabled: true,
          key: '/path/to/key',
          redirectHttpFromPort: 1234,
        },
      };
      expect(() => configSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
        `"The health gateway does not accept http traffic to [port] when ssl is enabled (only https is allowed), so [ssl.redirectHttpFromPort] cannot be configured to the same value. Both are [1234]."`
      );
    });
  });

  describe('socketTimeout', () => {
    test('can specify socket timeouts', () => {
      const obj = {
        keepaliveTimeout: 1e5,
        socketTimeout: 5e5,
      };
      const { keepaliveTimeout, socketTimeout } = config.schema.validate(obj);
      expect(keepaliveTimeout).toBe(1e5);
      expect(socketTimeout).toBe(5e5);
    });
  });

  describe('cors', () => {
    test('is always disabled', () => {
      const configSchema = config.schema;
      const obj = {};
      expect(new ServerConfig(configSchema.validate(obj)).cors).toMatchInlineSnapshot(`
        Object {
          "allowCredentials": false,
          "allowOrigin": Array [
            "*",
          ],
          "enabled": false,
        }
      `);
    });
  });

  describe('restrictInternalApis', () => {
    test('is true by default', () => {
      const configSchema = config.schema;
      const obj = {};
      expect(new ServerConfig(configSchema.validate(obj)).restrictInternalApis).toBe(true);
    });

    test('can specify retriction on access to internal APIs', () => {
      const configSchema = config.schema;
      expect(
        new ServerConfig(configSchema.validate({ restrictInternalApis: true })).restrictInternalApis
      ).toBe(true);

      expect(
        new ServerConfig(configSchema.validate({ restrictInternalApis: false }))
          .restrictInternalApis
      ).toBe(false);
    });

    test('throws if not boolean', () => {
      const configSchema = config.schema;
      expect(() => configSchema.validate({ restrictInternalApis: 100 })).toThrowError(
        'restrictInternalApis]: expected value of type [boolean] but got [number]'
      );
      expect(() => configSchema.validate({ restrictInternalApis: 'something' })).toThrowError(
        'restrictInternalApis]: expected value of type [boolean] but got [string]'
      );
    });
  });
});
