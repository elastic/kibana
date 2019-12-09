/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { config, HttpConfig } from '.';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';

const validHostnames = ['www.example.com', '8.8.8.8', '::1', 'localhost'];
const invalidHostname = 'asdf$%^';

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
  const httpSchema = config.schema;
  const obj = {
    host: invalidHostname,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('can specify max payload as string', () => {
  const obj = {
    maxPayload: '2mb',
  };
  const configValue = config.schema.validate(obj);
  expect(configValue.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
});

test('throws if basepath is missing prepended slash', () => {
  const httpSchema = config.schema;
  const obj = {
    basePath: 'foo',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath appends a slash', () => {
  const httpSchema = config.schema;
  const obj = {
    basePath: '/foo/',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath is not specified, but rewriteBasePath is set', () => {
  const httpSchema = config.schema;
  const obj = {
    rewriteBasePath: true,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

describe('with TLS', () => {
  test('throws if TLS is enabled but `key` is not specified', () => {
    const httpSchema = config.schema;
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if TLS is enabled but `certificate` is not specified', () => {
    const httpSchema = config.schema;
    const obj = {
      ssl: {
        enabled: true,
        key: '/path/to/key',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

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

  test('throws if TLS is not enabled but `clientAuthentication` is `optional`', () => {
    const httpSchema = config.schema;
    const obj = {
      port: 1234,
      ssl: {
        enabled: false,
        clientAuthentication: 'optional',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"[ssl]: must enable ssl to use [clientAuthentication]"`
    );
  });

  test('throws if TLS is not enabled but `clientAuthentication` is `required`', () => {
    const httpSchema = config.schema;
    const obj = {
      port: 1234,
      ssl: {
        enabled: false,
        clientAuthentication: 'required',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"[ssl]: must enable ssl to use [clientAuthentication]"`
    );
  });

  test('can specify `none` for [clientAuthentication] if ssl is not enabled', () => {
    const obj = {
      ssl: {
        enabled: false,
        clientAuthentication: 'none',
      },
    };

    const configValue = config.schema.validate(obj);
    expect(configValue.ssl.clientAuthentication).toBe('none');
  });

  test('can specify single `certificateAuthority` as a string', () => {
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        certificateAuthorities: '/authority/',
        enabled: true,
        key: '/path/to/key',
      },
    };

    const configValue = config.schema.validate(obj);
    expect(configValue.ssl.certificateAuthorities).toBe('/authority/');
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

  test('can specify several `certificateAuthorities`', () => {
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        certificateAuthorities: ['/authority/1', '/authority/2'],
        enabled: true,
        key: '/path/to/key',
      },
    };

    const configValue = config.schema.validate(obj);
    expect(configValue.ssl.certificateAuthorities).toEqual(['/authority/1', '/authority/2']);
  });

  test('accepts known protocols`', () => {
    const httpSchema = config.schema;
    const singleKnownProtocol = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        supportedProtocols: ['TLSv1'],
      },
    };

    const allKnownProtocols = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
      },
    };

    const singleKnownProtocolConfig = httpSchema.validate(singleKnownProtocol);
    expect(singleKnownProtocolConfig.ssl.supportedProtocols).toEqual(['TLSv1']);

    const allKnownProtocolsConfig = httpSchema.validate(allKnownProtocols);
    expect(allKnownProtocolsConfig.ssl.supportedProtocols).toEqual(['TLSv1', 'TLSv1.1', 'TLSv1.2']);
  });

  test('should accept known protocols`', () => {
    const httpSchema = config.schema;

    const singleUnknownProtocol = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        supportedProtocols: ['SOMEv100500'],
      },
    };

    const allKnownWithOneUnknownProtocols = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'SOMEv100500'],
      },
    };

    expect(() => httpSchema.validate(singleUnknownProtocol)).toThrowErrorMatchingSnapshot();
    expect(() =>
      httpSchema.validate(allKnownWithOneUnknownProtocols)
    ).toThrowErrorMatchingSnapshot();
  });

  test('HttpConfig instance should properly interpret `none` client authentication', () => {
    const httpConfig = new HttpConfig(
      config.schema.validate({
        ssl: {
          enabled: true,
          key: 'some-key-path',
          certificate: 'some-certificate-path',
          clientAuthentication: 'none',
        },
      }),
      Env.createDefault(getEnvOptions())
    );

    expect(httpConfig.ssl.requestCert).toBe(false);
    expect(httpConfig.ssl.rejectUnauthorized).toBe(false);
  });

  test('HttpConfig instance should properly interpret `optional` client authentication', () => {
    const httpConfig = new HttpConfig(
      config.schema.validate({
        ssl: {
          enabled: true,
          key: 'some-key-path',
          certificate: 'some-certificate-path',
          clientAuthentication: 'optional',
        },
      }),
      Env.createDefault(getEnvOptions())
    );

    expect(httpConfig.ssl.requestCert).toBe(true);
    expect(httpConfig.ssl.rejectUnauthorized).toBe(false);
  });

  test('HttpConfig instance should properly interpret `required` client authentication', () => {
    const httpConfig = new HttpConfig(
      config.schema.validate({
        ssl: {
          enabled: true,
          key: 'some-key-path',
          certificate: 'some-certificate-path',
          clientAuthentication: 'required',
        },
      }),
      Env.createDefault(getEnvOptions())
    );

    expect(httpConfig.ssl.requestCert).toBe(true);
    expect(httpConfig.ssl.rejectUnauthorized).toBe(true);
  });
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
    const invalidHostnames = {
      compression: {
        referrerWhitelist: [invalidHostname],
      },
    };
    const emptyArray = {
      compression: {
        referrerWhitelist: [],
      },
    };
    expect(() => httpSchema.validate(invalidHostnames)).toThrowErrorMatchingSnapshot();
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
