/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockReadFileSync,
  mockReadPkcs12Keystore,
  mockReadPkcs12Truststore,
} from './elasticsearch_config.test.mocks';

import { ElasticsearchConfig, config } from './elasticsearch_config';
import { getDeprecationsFor } from '../config/test_utils';

const CONFIG_PATH = 'elasticsearch';

const applyElasticsearchDeprecations = (settings: Record<string, any> = {}) =>
  getDeprecationsFor({
    provider: config.deprecations!,
    settings,
    path: CONFIG_PATH,
  });

test('set correct defaults', () => {
  const configValue = new ElasticsearchConfig(config.schema.validate({}));
  expect(configValue).toMatchInlineSnapshot(`
    ElasticsearchConfig {
      "apiVersion": "master",
      "compression": false,
      "customHeaders": Object {},
      "healthCheckDelay": "PT2.5S",
      "hosts": Array [
        "http://localhost:9200",
      ],
      "ignoreVersionMismatch": false,
      "maxSockets": Infinity,
      "password": undefined,
      "pingTimeout": "PT30S",
      "requestHeadersWhitelist": Array [
        "authorization",
      ],
      "requestTimeout": "PT30S",
      "serviceAccountToken": undefined,
      "shardTimeout": "PT30S",
      "skipStartupConnectionCheck": false,
      "sniffInterval": false,
      "sniffOnConnectionFault": false,
      "sniffOnStart": false,
      "ssl": Object {
        "alwaysPresentCertificate": false,
        "certificate": undefined,
        "certificateAuthorities": undefined,
        "key": undefined,
        "keyPassphrase": undefined,
        "verificationMode": "full",
      },
      "username": undefined,
    }
  `);
});

test('#hosts accepts both string and array of strings', () => {
  let configValue = new ElasticsearchConfig(
    config.schema.validate({ hosts: 'http://some.host:1234' })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234']);

  configValue = new ElasticsearchConfig(
    config.schema.validate({ hosts: ['http://some.host:1234'] })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234']);

  configValue = new ElasticsearchConfig(
    config.schema.validate({
      hosts: ['http://some.host:1234', 'https://some.another.host'],
    })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234', 'https://some.another.host']);
});

describe('#maxSockets', () => {
  test('accepts positive numeric values', () => {
    const configValue = new ElasticsearchConfig(config.schema.validate({ maxSockets: 512 }));
    expect(configValue.maxSockets).toEqual(512);
  });

  test('throws if it does not contain a numeric value', () => {
    expect(() => {
      config.schema.validate({ maxSockets: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[maxSockets]: expected value of type [number] but got [string]"`
    );

    expect(() => {
      config.schema.validate({ maxSockets: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[maxSockets]: expected value of type [number] but got [boolean]"`
    );
  });

  test('throws if it does not contain a valid numeric value', () => {
    expect(() => {
      config.schema.validate({ maxSockets: -1 });
    }).toThrowErrorMatchingInlineSnapshot(
      '"[maxSockets]: Value must be equal to or greater than [1]."'
    );

    expect(() => {
      config.schema.validate({ maxSockets: 0 });
    }).toThrowErrorMatchingInlineSnapshot(
      '"[maxSockets]: Value must be equal to or greater than [1]."'
    );

    expect(() => {
      config.schema.validate({ maxSockets: Infinity });
    }).toThrowErrorMatchingInlineSnapshot('"[maxSockets]: \\"maxSockets\\" cannot be infinity"');
  });
});

test('#requestHeadersWhitelist accepts both string and array of strings', () => {
  let configValue = new ElasticsearchConfig(
    config.schema.validate({ requestHeadersWhitelist: 'token' })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token']);

  configValue = new ElasticsearchConfig(
    config.schema.validate({ requestHeadersWhitelist: ['token'] })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token']);

  configValue = new ElasticsearchConfig(
    config.schema.validate({
      requestHeadersWhitelist: ['token', 'X-Forwarded-Proto'],
    })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token', 'X-Forwarded-Proto']);
});

describe('reserved headers', () => {
  test('throws if customHeaders contains reserved headers', () => {
    expect(() => {
      config.schema.validate({
        customHeaders: { foo: 'bar', 'x-elastic-product-origin': 'beats' },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[customHeaders]: cannot use reserved headers: [x-elastic-product-origin]"`
    );
  });

  test('throws if requestHeadersWhitelist contains reserved headers', () => {
    expect(() => {
      config.schema.validate({ requestHeadersWhitelist: ['foo', 'x-elastic-product-origin'] });
    }).toThrowErrorMatchingInlineSnapshot(`
      "[requestHeadersWhitelist]: types that failed validation:
      - [requestHeadersWhitelist.0]: expected value of type [string] but got [Array]
      - [requestHeadersWhitelist.1]: cannot use reserved headers: [x-elastic-product-origin]"
    `);
    expect(() => {
      config.schema.validate({ requestHeadersWhitelist: 'x-elastic-product-origin' });
    }).toThrowErrorMatchingInlineSnapshot(`
      "[requestHeadersWhitelist]: types that failed validation:
      - [requestHeadersWhitelist.0]: cannot use reserved headers: [x-elastic-product-origin]
      - [requestHeadersWhitelist.1]: could not parse array value from json input"
    `);
  });
});

describe('reads files', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
    mockReadPkcs12Keystore.mockReset();
    mockReadPkcs12Keystore.mockImplementation((path: string) => ({
      key: `content-of-${path}.key`,
      cert: `content-of-${path}.cert`,
      ca: [`content-of-${path}.ca`],
    }));
    mockReadPkcs12Truststore.mockReset();
    mockReadPkcs12Truststore.mockImplementation((path: string) => [`content-of-${path}`]);
  });

  it('reads certificate authorities when ssl.keystore.path is specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { keystore: { path: 'some-path' } } })
    );
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path.ca']);
  });

  it('reads certificate authorities when ssl.truststore.path is specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { truststore: { path: 'some-path' } } })
    );
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is specified', () => {
    let configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: ['some-path'] } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = new ElasticsearchConfig(
      config.schema.validate({
        ssl: { certificateAuthorities: ['some-path', 'another-path'] },
      })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    expect(configValue.ssl.certificateAuthorities).toEqual([
      'content-of-some-path',
      'content-of-another-path',
    ]);
  });

  it('reads certificate authorities when ssl.keystore.path, ssl.truststore.path, and ssl.certificateAuthorities are specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({
        ssl: {
          keystore: { path: 'some-path' },
          truststore: { path: 'another-path' },
          certificateAuthorities: 'yet-another-path',
        },
      })
    );
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual([
      'content-of-some-path.ca',
      'content-of-another-path',
      'content-of-yet-another-path',
    ]);
  });

  it('reads a private key and certificate when ssl.keystore.path is specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { keystore: { path: 'some-path' } } })
    );
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.key).toEqual('content-of-some-path.key');
    expect(configValue.ssl.certificate).toEqual('content-of-some-path.cert');
  });

  it('reads a private key when ssl.key is specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { key: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.key).toEqual('content-of-some-path');
  });

  it('reads a certificate when ssl.certificate is specified', () => {
    const configValue = new ElasticsearchConfig(
      config.schema.validate({ ssl: { certificate: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificate).toEqual('content-of-some-path');
  });
});

describe('throws when config is invalid', () => {
  beforeAll(() => {
    const realFs = jest.requireActual('fs');
    mockReadFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
    const crypto = jest.requireActual('@kbn/crypto');
    mockReadPkcs12Keystore.mockImplementation((path: string, password?: string) =>
      crypto.readPkcs12Keystore(path, password)
    );
    mockReadPkcs12Truststore.mockImplementation((path: string, password?: string) =>
      crypto.readPkcs12Truststore(path, password)
    );
  });

  it('throws if key is invalid', () => {
    const value = { ssl: { key: '/invalid/key' } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/key'"`
    );
  });

  it('throws if certificate is invalid', () => {
    const value = { ssl: { certificate: '/invalid/cert' } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/cert'"`
    );
  });

  it('throws if certificateAuthorities is invalid', () => {
    const value = { ssl: { certificateAuthorities: '/invalid/ca' } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(`"ENOENT: no such file or directory, open '/invalid/ca'"`);
  });

  it('throws if keystore path is invalid', () => {
    const value = { ssl: { keystore: { path: '/invalid/keystore' } } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/keystore'"`
    );
  });

  it('throws if keystore does not contain a key', () => {
    mockReadPkcs12Keystore.mockReturnValueOnce({});
    const value = { ssl: { keystore: { path: 'some-path' } } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(`"Did not find key in Elasticsearch keystore."`);
  });

  it('throws if keystore does not contain a certificate', () => {
    mockReadPkcs12Keystore.mockReturnValueOnce({ key: 'foo' });
    const value = { ssl: { keystore: { path: 'some-path' } } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(`"Did not find certificate in Elasticsearch keystore."`);
  });

  it('throws if truststore path is invalid', () => {
    const value = { ssl: { keystore: { path: '/invalid/truststore' } } };
    expect(
      () => new ElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/truststore'"`
    );
  });

  it('throws if key and keystore.path are both specified', () => {
    const value = { ssl: { key: 'foo', keystore: { path: 'bar' } } };
    expect(() => config.schema.validate(value)).toThrowErrorMatchingInlineSnapshot(
      `"[ssl]: cannot use [key] when [keystore.path] is specified"`
    );
  });

  it('throws if certificate and keystore.path are both specified', () => {
    const value = { ssl: { certificate: 'foo', keystore: { path: 'bar' } } };
    expect(() => config.schema.validate(value)).toThrowErrorMatchingInlineSnapshot(
      `"[ssl]: cannot use [certificate] when [keystore.path] is specified"`
    );
  });
});

describe('deprecations', () => {
  it('logs a warning if elasticsearch.username is set to "kibana"', () => {
    const { messages } = applyElasticsearchDeprecations({ username: 'kibana' });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Kibana is configured to authenticate to Elasticsearch with the \\"kibana\\" user. Use a service account token instead.",
      ]
    `);
  });

  it('does not log a warning if elasticsearch.username is set to something besides "elastic" or "kibana"', () => {
    const { messages } = applyElasticsearchDeprecations({ username: 'otheruser' });
    expect(messages).toHaveLength(0);
  });

  it('does not log a warning if elasticsearch.username is unset', () => {
    const { messages } = applyElasticsearchDeprecations({});
    expect(messages).toHaveLength(0);
  });

  it('logs a warning if ssl.key is set and ssl.certificate is not', () => {
    const { messages } = applyElasticsearchDeprecations({ ssl: { key: '' } });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Use both \\"elasticsearch.ssl.key\\" and \\"elasticsearch.ssl.certificate\\" to enable Kibana to use Mutual TLS authentication with Elasticsearch.",
      ]
    `);
  });

  it('logs a warning if ssl.certificate is set and ssl.key is not', () => {
    const { messages } = applyElasticsearchDeprecations({ ssl: { certificate: '' } });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Use both \\"elasticsearch.ssl.certificate\\" and \\"elasticsearch.ssl.key\\" to enable Kibana to use Mutual TLS authentication with Elasticsearch.",
      ]
    `);
  });

  it('does not log a warning if both ssl.key and ssl.certificate are set', () => {
    const { messages } = applyElasticsearchDeprecations({ ssl: { key: '', certificate: '' } });
    expect(messages).toEqual([]);
  });
});

test('#username throws if equal to "elastic"', () => {
  const obj = {
    username: 'elastic',
  };

  expect(() => config.schema.validate(obj)).toThrow('[username]: value of "elastic" is forbidden');
});

test('serviceAccountToken throws if username is also set', () => {
  const obj = {
    username: 'kibana',
    serviceAccountToken: 'abc123',
  };

  expect(() => config.schema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
    `"[serviceAccountToken]: serviceAccountToken cannot be specified when \\"username\\" is also set."`
  );
});

test('serviceAccountToken does not throw if username is not set', () => {
  const obj = {
    serviceAccountToken: 'abc123',
  };

  expect(() => config.schema.validate(obj)).not.toThrow();
});

describe('skipStartupConnectionCheck', () => {
  test('defaults to `false`', () => {
    const obj = {};
    expect(() => config.schema.validate(obj)).not.toThrow();
    expect(config.schema.validate(obj)).toEqual(
      expect.objectContaining({
        skipStartupConnectionCheck: false,
      })
    );
  });

  test('accepts `false` on both prod and dev mode', () => {
    const obj = {
      skipStartupConnectionCheck: false,
    };
    expect(() => config.schema.validate(obj, { dist: false })).not.toThrow();
    expect(() => config.schema.validate(obj, { dist: true })).not.toThrow();
  });

  test('accepts `true` only when running from source to allow integration tests to run without an ES server', () => {
    const obj = {
      skipStartupConnectionCheck: true,
    };
    expect(() => config.schema.validate(obj, { dist: false })).not.toThrow();
    expect(() => config.schema.validate(obj, { dist: true })).toThrowErrorMatchingInlineSnapshot(
      `"[skipStartupConnectionCheck]: \\"skipStartupConnectionCheck\\" can only be set to true when running from source to allow integration tests to run without an ES server"`
    );
  });
});
