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

import {
  mockReadFileSync,
  mockReadPkcs12Keystore,
  mockReadPkcs12Truststore,
} from './ssl_config.test.mocks';

import { sslSchema, SslConfig } from './ssl_config';

const createConfig = (obj: any) => new SslConfig(sslSchema.validate(obj));

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

describe('throws when config is invalid', () => {
  beforeEach(() => {
    const realFs = jest.requireActual('fs');
    mockReadFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
    const utils = jest.requireActual('../../utils');
    mockReadPkcs12Keystore.mockImplementation((path: string, password?: string) =>
      utils.readPkcs12Keystore(path, password)
    );
    mockReadPkcs12Truststore.mockImplementation((path: string, password?: string) =>
      utils.readPkcs12Truststore(path, password)
    );
  });

  test('throws if `key` is invalid', () => {
    const obj = { key: '/invalid/key', certificate: '/valid/certificate' };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/key'"`
    );
  });

  test('throws if `certificate` is invalid', () => {
    mockReadFileSync.mockImplementationOnce((path: string) => `content-of-${path}`);
    const obj = { key: '/valid/key', certificate: '/invalid/certificate' };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/certificate'"`
    );
  });

  test('throws if `certificateAuthorities` is invalid', () => {
    const obj = { certificateAuthorities: '/invalid/ca' };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/ca'"`
    );
  });

  test('throws if `keystore.path` is invalid', () => {
    const obj = { keystore: { path: '/invalid/keystore' } };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/keystore'"`
    );
  });

  test('throws if `keystore.path` does not contain a private key', () => {
    mockReadPkcs12Keystore.mockImplementation((path: string, password?: string) => ({
      key: undefined,
      certificate: 'foo',
    }));
    const obj = { keystore: { path: 'some-path' } };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"Did not find private key in keystore at [keystore.path]."`
    );
  });

  test('throws if `keystore.path` does not contain a certificate', () => {
    mockReadPkcs12Keystore.mockImplementation((path: string, password?: string) => ({
      key: 'foo',
      certificate: undefined,
    }));
    const obj = { keystore: { path: 'some-path' } };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"Did not find certificate in keystore at [keystore.path]."`
    );
  });

  test('throws if `truststore.path` is invalid', () => {
    const obj = { truststore: { path: '/invalid/truststore' } };
    expect(() => createConfig(obj)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/truststore'"`
    );
  });

  test('throws if both `key` and `keystore.path` are specified', () => {
    const obj = {
      key: '/path/to/key',
      keystore: {
        path: 'path/to/keystore',
      },
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"cannot use [key] when [keystore.path] is specified"`
    );
  });

  test('throws if both `certificate` and `keystore.path` are specified', () => {
    const obj = {
      certificate: '/path/to/certificate',
      keystore: {
        path: 'path/to/keystore',
      },
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"cannot use [certificate] when [keystore.path] is specified"`
    );
  });

  test('throws if TLS is enabled but `certificate` is specified and `key` is not', () => {
    const obj = {
      certificate: '/path/to/certificate',
      enabled: true,
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must specify [certificate] and [key] -- or [keystore.path] -- when ssl is enabled"`
    );
  });

  test('throws if TLS is enabled but `key` is specified and `certificate` is not', () => {
    const obj = {
      enabled: true,
      key: '/path/to/key',
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must specify [certificate] and [key] -- or [keystore.path] -- when ssl is enabled"`
    );
  });

  test('throws if TLS is enabled but `key`, `certificate`, and `keystore.path` are not specified', () => {
    const obj = {
      enabled: true,
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must specify [certificate] and [key] -- or [keystore.path] -- when ssl is enabled"`
    );
  });

  test('throws if TLS is not enabled but `clientAuthentication` is `optional`', () => {
    const obj = {
      enabled: false,
      clientAuthentication: 'optional',
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must enable ssl to use [clientAuthentication]"`
    );
  });

  test('throws if TLS is not enabled but `clientAuthentication` is `required`', () => {
    const obj = {
      enabled: false,
      clientAuthentication: 'required',
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must enable ssl to use [clientAuthentication]"`
    );
  });
});

describe('reads files', () => {
  it('reads certificate authorities when `keystore.path` is specified', () => {
    const configValue = createConfig({ keystore: { path: 'some-path' } });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual(['content-of-some-path.ca']);
  });

  it('reads certificate authorities when `truststore.path` is specified', () => {
    const configValue = createConfig({ truststore: { path: 'some-path' } });
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual(['content-of-some-path']);
  });

  it('reads certificate authorities when `certificateAuthorities` is specified', () => {
    let configValue = createConfig({ certificateAuthorities: 'some-path' });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = createConfig({ certificateAuthorities: ['some-path'] });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = createConfig({ certificateAuthorities: ['some-path', 'another-path'] });
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    expect(configValue.certificateAuthorities).toEqual([
      'content-of-some-path',
      'content-of-another-path',
    ]);
  });

  it('reads certificate authorities when `keystore.path`, `truststore.path`, and `certificateAuthorities` are specified', () => {
    const configValue = createConfig({
      keystore: { path: 'some-path' },
      truststore: { path: 'another-path' },
      certificateAuthorities: 'yet-another-path',
    });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual([
      'content-of-some-path.ca',
      'content-of-another-path',
      'content-of-yet-another-path',
    ]);
  });

  it('reads a private key and certificate when `keystore.path` is specified', () => {
    const configValue = createConfig({ keystore: { path: 'some-path' } });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.key).toEqual('content-of-some-path.key');
    expect(configValue.certificate).toEqual('content-of-some-path.cert');
  });

  it('reads a private key and certificate when `key` and `certificate` are specified', () => {
    const configValue = createConfig({ key: 'some-path', certificate: 'another-path' });
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    expect(configValue.key).toEqual('content-of-some-path');
    expect(configValue.certificate).toEqual('content-of-another-path');
  });
});

describe('#supportedProtocols', () => {
  test('accepts known protocols`', () => {
    const singleKnownProtocol = {
      certificate: '/path/to/certificate',
      enabled: true,
      key: '/path/to/key',
      supportedProtocols: ['TLSv1'],
    };

    const allKnownProtocols = {
      certificate: '/path/to/certificate',
      enabled: true,
      key: '/path/to/key',
      supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
    };

    const singleKnownProtocolConfig = sslSchema.validate(singleKnownProtocol);
    expect(singleKnownProtocolConfig.supportedProtocols).toEqual(['TLSv1']);

    const allKnownProtocolsConfig = sslSchema.validate(allKnownProtocols);
    expect(allKnownProtocolsConfig.supportedProtocols).toEqual(['TLSv1', 'TLSv1.1', 'TLSv1.2']);
  });

  test('rejects unknown protocols`', () => {
    const singleUnknownProtocol = {
      certificate: '/path/to/certificate',
      enabled: true,
      key: '/path/to/key',
      supportedProtocols: ['SOMEv100500'],
    };

    const allKnownWithOneUnknownProtocols = {
      certificate: '/path/to/certificate',
      enabled: true,
      key: '/path/to/key',
      supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'SOMEv100500'],
    };

    expect(() => sslSchema.validate(singleUnknownProtocol)).toThrowErrorMatchingInlineSnapshot(`
"[supportedProtocols.0]: types that failed validation:
- [supportedProtocols.0.0]: expected value to equal [TLSv1] but got [SOMEv100500]
- [supportedProtocols.0.1]: expected value to equal [TLSv1.1] but got [SOMEv100500]
- [supportedProtocols.0.2]: expected value to equal [TLSv1.2] but got [SOMEv100500]"
`);
    expect(() => sslSchema.validate(allKnownWithOneUnknownProtocols))
      .toThrowErrorMatchingInlineSnapshot(`
"[supportedProtocols.3]: types that failed validation:
- [supportedProtocols.3.0]: expected value to equal [TLSv1] but got [SOMEv100500]
- [supportedProtocols.3.1]: expected value to equal [TLSv1.1] but got [SOMEv100500]
- [supportedProtocols.3.2]: expected value to equal [TLSv1.2] but got [SOMEv100500]"
`);
  });
});

describe('#clientAuthentication', () => {
  test('can specify `none` client authentication when ssl is not enabled', () => {
    const obj = {
      enabled: false,
      clientAuthentication: 'none',
    };

    const configValue = sslSchema.validate(obj);
    expect(configValue.clientAuthentication).toBe('none');
  });

  test('should properly interpret `none` client authentication when ssl is enabled', () => {
    const sslConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        key: 'some-key-path',
        certificate: 'some-certificate-path',
        clientAuthentication: 'none',
      })
    );

    expect(sslConfig.requestCert).toBe(false);
    expect(sslConfig.rejectUnauthorized).toBe(false);
  });

  test('should properly interpret `optional` client authentication when ssl is enabled', () => {
    const sslConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        key: 'some-key-path',
        certificate: 'some-certificate-path',
        clientAuthentication: 'optional',
      })
    );

    expect(sslConfig.requestCert).toBe(true);
    expect(sslConfig.rejectUnauthorized).toBe(false);
  });

  test('should properly interpret `required` client authentication when ssl is enabled', () => {
    const sslConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        key: 'some-key-path',
        certificate: 'some-certificate-path',
        clientAuthentication: 'required',
      })
    );

    expect(sslConfig.requestCert).toBe(true);
    expect(sslConfig.rejectUnauthorized).toBe(true);
  });
});
