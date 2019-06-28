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

import { config } from '.';

test('has defaults for config', () => {
  const httpSchema = config.schema;
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('accepts valid hostnames', () => {
  const { host: host1 } = config.schema.validate({ host: 'www.example.com' });
  const { host: host2 } = config.schema.validate({ host: '8.8.8.8' });
  const { host: host3 } = config.schema.validate({ host: '::1' });
  const { host: host4 } = config.schema.validate({ host: 'localhost' });

  expect({ host1, host2, host3, host4 }).toMatchSnapshot('valid host names');
});

test('throws if invalid hostname', () => {
  const httpSchema = config.schema;
  const obj = {
    host: 'asdf$%^',
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
});
