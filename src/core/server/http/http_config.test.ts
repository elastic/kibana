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

import { HttpConfig } from '.';

test('has defaults for config', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('accepts valid hostnames', () => {
  const { host: host1 } = HttpConfig.schema.validate({ host: 'www.example.com' });
  const { host: host2 } = HttpConfig.schema.validate({ host: '8.8.8.8' });
  const { host: host3 } = HttpConfig.schema.validate({ host: '::1' });
  const { host: host4 } = HttpConfig.schema.validate({ host: 'localhost' });

  expect({ host1, host2, host3, host4 }).toMatchSnapshot('valid host names');
});

test('throws if invalid hostname', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    host: 'asdf$%^',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('can specify max payload as string', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    maxPayload: '2mb',
  };
  const config = httpSchema.validate(obj);
  expect(config.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
});

test('throws if basepath is missing prepended slash', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    basePath: 'foo',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath appends a slash', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    basePath: '/foo/',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath is not specified, but rewriteBasePath is set', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    rewriteBasePath: true,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

describe('with TLS', () => {
  test('throws if TLS is enabled but `key` is not specified', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if TLS is enabled but `certificate` is not specified', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        enabled: true,
        key: '/path/to/key',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if TLS is enabled but `redirectHttpFromPort` is equal to `port`', () => {
    const httpSchema = HttpConfig.schema;
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
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        certificateAuthorities: '/authority/',
        enabled: true,
        key: '/path/to/key',
      },
    };

    const config = httpSchema.validate(obj);
    expect(config.ssl.certificateAuthorities).toBe('/authority/');
  });

  test('can specify several `certificateAuthorities`', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        certificate: '/path/to/certificate',
        certificateAuthorities: ['/authority/1', '/authority/2'],
        enabled: true,
        key: '/path/to/key',
      },
    };

    const config = httpSchema.validate(obj);
    expect(config.ssl.certificateAuthorities).toEqual(['/authority/1', '/authority/2']);
  });

  test('accepts known protocols`', () => {
    const httpSchema = HttpConfig.schema;
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
    const httpSchema = HttpConfig.schema;

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
