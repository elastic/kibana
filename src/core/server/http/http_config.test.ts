/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { config, HttpConfig } from './http_config';
import { CspConfig } from '../csp';
import { ExternalUrlConfig } from '../external_url';

const validHostnames = ['www.example.com', '8.8.8.8', '::1', 'localhost', '0.0.0.0'];
const invalidHostnames = ['asdf$%^', '0'];

jest.mock('os', () => {
  const original = jest.requireActual('os');

  return {
    ...original,
    hostname: () => 'kibana-hostname',
  };
});

test('has defaults for config', () => {
  const httpSchema = config.schema;
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('accepts valid hostnames', () => {
  for (const val of validHostnames) {
    const { host } = config.schema.validate({ host: val });
    expect({ host }).toMatchSnapshot();
  }
});

test('throws if invalid hostname', () => {
  for (const host of invalidHostnames) {
    const httpSchema = config.schema;
    expect(() => httpSchema.validate({ host })).toThrowErrorMatchingSnapshot();
  }
});

describe('requestId', () => {
  test('accepts valid ip addresses', () => {
    const {
      requestId: { ipAllowlist },
    } = config.schema.validate({
      requestId: {
        allowFromAnyIp: false,
        ipAllowlist: ['0.0.0.0', '123.123.123.123', '1200:0000:AB00:1234:0000:2552:7777:1313'],
      },
    });
    expect(ipAllowlist).toMatchInlineSnapshot(`
      Array [
        "0.0.0.0",
        "123.123.123.123",
        "1200:0000:AB00:1234:0000:2552:7777:1313",
      ]
    `);
  });

  test('rejects invalid ip addresses', () => {
    expect(() => {
      config.schema.validate({
        requestId: {
          allowFromAnyIp: false,
          ipAllowlist: ['1200:0000:AB00:1234:O000:2552:7777:1313', '[2001:db8:0:1]:80'],
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[requestId.ipAllowlist.0]: value must be a valid ipv4 or ipv6 address"`
    );
  });

  test('rejects if allowFromAnyIp is `true` and `ipAllowlist` is non-empty', () => {
    expect(() => {
      config.schema.validate({
        requestId: {
          allowFromAnyIp: true,
          ipAllowlist: ['0.0.0.0', '123.123.123.123', '1200:0000:AB00:1234:0000:2552:7777:1313'],
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[requestId]: allowFromAnyIp must be set to 'false' if any values are specified in ipAllowlist"`
    );

    expect(() => {
      config.schema.validate({
        requestId: {
          allowFromAnyIp: true,
          ipAllowlist: ['0.0.0.0', '123.123.123.123', '1200:0000:AB00:1234:0000:2552:7777:1313'],
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[requestId]: allowFromAnyIp must be set to 'false' if any values are specified in ipAllowlist"`
    );
  });
});

test('can specify max payload as string', () => {
  const obj = {
    maxPayload: '2mb',
  };
  const configValue = config.schema.validate(obj);
  expect(configValue.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
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

describe('basePath', () => {
  test('throws if missing prepended slash', () => {
    const httpSchema = config.schema;
    const obj = {
      basePath: 'foo',
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if appends a slash', () => {
    const httpSchema = config.schema;
    const obj = {
      basePath: '/foo/',
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if is an empty string', () => {
    const httpSchema = config.schema;
    const obj = {
      basePath: '',
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if not specified, but rewriteBasePath is set', () => {
    const httpSchema = config.schema;
    const obj = {
      rewriteBasePath: true,
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });
});

describe('publicBaseUrl', () => {
  test('throws if invalid HTTP(S) URL', () => {
    const httpSchema = config.schema;
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'myhost.com' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl]: expected URI with scheme [http|https]."`
    );
    expect(() =>
      httpSchema.validate({ publicBaseUrl: '//myhost.com' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl]: expected URI with scheme [http|https]."`
    );
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'ftp://myhost.com' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl]: expected URI with scheme [http|https]."`
    );
  });

  test('throws if includes hash, query, or auth', () => {
    const httpSchema = config.schema;
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'http://myhost.com/?a=b' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl] may only contain a protocol, host, port, and pathname"`
    );
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'http://myhost.com/#a' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl] may only contain a protocol, host, port, and pathname"`
    );
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'http://user:pass@myhost.com' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl] may only contain a protocol, host, port, and pathname"`
    );
  });

  test('throws if basePath and publicBaseUrl are specified, but do not match', () => {
    const httpSchema = config.schema;
    expect(() =>
      httpSchema.validate({
        basePath: '/foo',
        publicBaseUrl: 'https://myhost.com/',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[publicBaseUrl] must contain the [basePath]: / !== /foo"`
    );
  });

  test('does not throw if valid URL and matches basePath', () => {
    const httpSchema = config.schema;
    expect(() => httpSchema.validate({ publicBaseUrl: 'http://myhost.com' })).not.toThrow();
    expect(() => httpSchema.validate({ publicBaseUrl: 'http://myhost.com/' })).not.toThrow();
    expect(() => httpSchema.validate({ publicBaseUrl: 'https://myhost.com' })).not.toThrow();
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'https://myhost.com/foo', basePath: '/foo' })
    ).not.toThrow();
    expect(() => httpSchema.validate({ publicBaseUrl: 'http://myhost.com:8080' })).not.toThrow();
    expect(() =>
      httpSchema.validate({ publicBaseUrl: 'http://myhost.com:4/foo', basePath: '/foo' })
    ).not.toThrow();
  });
});

test('accepts only valid uuids for server.uuid', () => {
  const httpSchema = config.schema;
  expect(() => httpSchema.validate({ uuid: uuid.v4() })).not.toThrow();
  expect(() => httpSchema.validate({ uuid: 'not an uuid' })).toThrowErrorMatchingInlineSnapshot(
    `"[uuid]: must be a valid uuid"`
  );
});

test('uses os.hostname() as default for server.name', () => {
  const httpSchema = config.schema;
  const validated = httpSchema.validate({});
  expect(validated.name).toEqual('kibana-hostname');
});

test('throws if xsrf.allowlist element does not start with a slash', () => {
  const httpSchema = config.schema;
  const obj = {
    xsrf: {
      allowlist: ['/valid-path', 'invalid-path'],
    },
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
    `"[xsrf.allowlist.1]: must start with a slash"`
  );
});

test('accepts any type of objects for custom headers', () => {
  const httpSchema = config.schema;
  const obj = {
    customResponseHeaders: {
      string: 'string',
      bool: true,
      number: 12,
      array: [1, 2, 3],
      nested: {
        foo: 1,
        bar: 'dolly',
      },
    },
  };
  expect(() => httpSchema.validate(obj)).not.toThrow();
});

describe('with TLS', () => {
  test('throws if TLS is enabled but `redirectHttpFromPort` is equal to `port`', () => {
    const httpSchema = config.schema;
    const obj = {
      port: 1234,
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        redirectHttpFromPort: 1234,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });
});

test('can specify socket timeouts', () => {
  const obj = {
    keepaliveTimeout: 1e5,
    socketTimeout: 5e5,
  };
  const { keepaliveTimeout, socketTimeout } = config.schema.validate(obj);
  expect(keepaliveTimeout).toBe(1e5);
  expect(socketTimeout).toBe(5e5);
});

describe('with compression', () => {
  test('accepts valid referrer whitelist', () => {
    const {
      compression: { referrerWhitelist },
    } = config.schema.validate({
      compression: {
        referrerWhitelist: validHostnames,
      },
    });

    expect(referrerWhitelist).toMatchSnapshot();
  });

  test('throws if invalid referrer whitelist', () => {
    const httpSchema = config.schema;
    const nonEmptyArray = {
      compression: {
        referrerWhitelist: invalidHostnames,
      },
    };
    const emptyArray = {
      compression: {
        referrerWhitelist: [],
      },
    };
    expect(() => httpSchema.validate(nonEmptyArray)).toThrowErrorMatchingSnapshot();
    expect(() => httpSchema.validate(emptyArray)).toThrowErrorMatchingSnapshot();
  });

  test('throws if referrer whitelist is specified and compression is disabled', () => {
    const httpSchema = config.schema;
    const obj = {
      compression: {
        enabled: false,
        referrerWhitelist: validHostnames,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });
});

describe('cors', () => {
  describe('allowOrigin', () => {
    it('list cannot be empty', () => {
      expect(() =>
        config.schema.validate({
          cors: {
            allowOrigin: [],
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        "[cors.allowOrigin]: types that failed validation:
        - [cors.allowOrigin.0]: array size is [0], but cannot be smaller than [1]
        - [cors.allowOrigin.1]: array size is [0], but cannot be smaller than [1]"
      `);
    });

    it('list of valid URLs', () => {
      const allowOrigin = ['http://127.0.0.1:3000', 'https://elastic.co'];
      expect(
        config.schema.validate({
          cors: { allowOrigin },
        }).cors.allowOrigin
      ).toStrictEqual(allowOrigin);

      expect(() =>
        config.schema.validate({
          cors: {
            allowOrigin: ['*://elastic.co/*'],
          },
        })
      ).toThrow();
    });

    it('can be configured as "*" wildcard', () => {
      expect(config.schema.validate({ cors: { allowOrigin: ['*'] } }).cors.allowOrigin).toEqual([
        '*',
      ]);
    });

    it('cannot mix wildcard "*" with valid URLs', () => {
      expect(
        () =>
          config.schema.validate({ cors: { allowOrigin: ['*', 'https://elastic.co'] } }).cors
            .allowOrigin
      ).toThrowErrorMatchingInlineSnapshot(`
        "[cors.allowOrigin]: types that failed validation:
        - [cors.allowOrigin.0.0]: expected URI with scheme [http|https].
        - [cors.allowOrigin.1.1]: expected value to equal [*]"
      `);
    });
  });
  describe('credentials', () => {
    it('cannot use wildcard allowOrigin if "credentials: true"', () => {
      expect(
        () =>
          config.schema.validate({ cors: { allowCredentials: true, allowOrigin: ['*'] } }).cors
            .allowOrigin
      ).toThrowErrorMatchingInlineSnapshot(
        `"[cors]: Cannot specify wildcard origin \\"*\\" with \\"credentials: true\\". Please provide a list of allowed origins."`
      );
      expect(
        () => config.schema.validate({ cors: { allowCredentials: true } }).cors.allowOrigin
      ).toThrowErrorMatchingInlineSnapshot(
        `"[cors]: Cannot specify wildcard origin \\"*\\" with \\"credentials: true\\". Please provide a list of allowed origins."`
      );
    });
  });
});

describe('HttpConfig', () => {
  it('converts customResponseHeaders to strings or arrays of strings', () => {
    const httpSchema = config.schema;
    const rawConfig = httpSchema.validate({
      customResponseHeaders: {
        string: 'string',
        bool: true,
        number: 12,
        array: [1, 2, 3],
        nested: {
          foo: 1,
          bar: 'dolly',
        },
      },
    });
    const httpConfig = new HttpConfig(rawConfig, CspConfig.DEFAULT, ExternalUrlConfig.DEFAULT);

    expect(httpConfig.customResponseHeaders).toEqual({
      string: 'string',
      bool: 'true',
      number: '12',
      array: ['1', '2', '3'],
      nested: '{"foo":1,"bar":"dolly"}',
    });
  });
});
