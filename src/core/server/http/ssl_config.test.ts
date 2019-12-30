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

import { mockReadFileSync } from './ssl_config.test.mocks';

import { sslSchema, SslConfig } from './ssl_config';

const createConfig = (obj: any) => new SslConfig(sslSchema.validate(obj));

beforeEach(() => {
  mockReadFileSync.mockReset();
  mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
});

describe('throws when config is invalid', () => {
  beforeEach(() => {
    const realFs = jest.requireActual('fs');
    mockReadFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
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

  test('throws if TLS is enabled but `certificate` is specified and `key` is not', () => {
    const obj = {
      certificate: '/path/to/certificate',
      enabled: true,
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must specify [certificate] and [key] when ssl is enabled"`
    );
  });

  test('throws if TLS is enabled but `key` is specified and `certificate` is not', () => {
    const obj = {
      enabled: true,
      key: '/path/to/key',
    };
    expect(() => sslSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
      `"must specify [certificate] and [key] when ssl is enabled"`
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
