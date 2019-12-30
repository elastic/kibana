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

import { mockReadFileSync } from './elasticsearch_config.test.mocks';

import { ElasticsearchConfig, config, ElasticsearchConfigType } from './elasticsearch_config';
import { loggingServiceMock } from '../mocks';
import { Logger } from '../logging';

const createElasticsearchConfig = (rawConfig: ElasticsearchConfigType, log?: Logger) => {
  if (!log) {
    log = loggingServiceMock.create().get('config');
  }
  return new ElasticsearchConfig(rawConfig, log);
};

test('set correct defaults', () => {
  const configValue = createElasticsearchConfig(config.schema.validate({}));
  expect(configValue).toMatchInlineSnapshot(`
    ElasticsearchConfig {
      "apiVersion": "master",
      "customHeaders": Object {},
      "healthCheckDelay": "PT2.5S",
      "hosts": Array [
        "http://localhost:9200",
      ],
      "ignoreVersionMismatch": false,
      "logQueries": false,
      "password": undefined,
      "pingTimeout": "PT30S",
      "requestHeadersWhitelist": Array [
        "authorization",
      ],
      "requestTimeout": "PT30S",
      "shardTimeout": "PT30S",
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
  let configValue = createElasticsearchConfig(
    config.schema.validate({ hosts: 'http://some.host:1234' })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234']);

  configValue = createElasticsearchConfig(
    config.schema.validate({ hosts: ['http://some.host:1234'] })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234']);

  configValue = createElasticsearchConfig(
    config.schema.validate({
      hosts: ['http://some.host:1234', 'https://some.another.host'],
    })
  );
  expect(configValue.hosts).toEqual(['http://some.host:1234', 'https://some.another.host']);
});

test('#requestHeadersWhitelist accepts both string and array of strings', () => {
  let configValue = createElasticsearchConfig(
    config.schema.validate({ requestHeadersWhitelist: 'token' })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token']);

  configValue = createElasticsearchConfig(
    config.schema.validate({ requestHeadersWhitelist: ['token'] })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token']);

  configValue = createElasticsearchConfig(
    config.schema.validate({
      requestHeadersWhitelist: ['token', 'X-Forwarded-Proto'],
    })
  );
  expect(configValue.requestHeadersWhitelist).toEqual(['token', 'X-Forwarded-Proto']);
});

describe('reads files', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is specified', () => {
    let configValue = createElasticsearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = createElasticsearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: ['some-path'] } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = createElasticsearchConfig(
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

  it('reads a private key when ssl.key is specified', () => {
    const configValue = createElasticsearchConfig(
      config.schema.validate({ ssl: { key: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.key).toEqual('content-of-some-path');
  });

  it('reads a certificate when ssl.certificate is specified', () => {
    const configValue = createElasticsearchConfig(
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
  });

  it('throws if key is invalid', () => {
    const value = { ssl: { key: '/invalid/key' } };
    expect(() =>
      createElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/key'"`
    );
  });

  it('throws if certificate is invalid', () => {
    const value = { ssl: { certificate: '/invalid/cert' } };
    expect(() =>
      createElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/cert'"`
    );
  });

  it('throws if certificateAuthorities is invalid', () => {
    const value = { ssl: { certificateAuthorities: '/invalid/ca' } };
    expect(() =>
      createElasticsearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(`"ENOENT: no such file or directory, open '/invalid/ca'"`);
  });
});

describe('logs warnings', () => {
  let logger: ReturnType<typeof loggingServiceMock.create>;
  let log: Logger;

  beforeAll(() => {
    mockReadFileSync.mockResolvedValue('foo');
  });

  beforeEach(() => {
    logger = loggingServiceMock.create();
    log = logger.get('config');
  });

  it('warns if ssl.key is set and ssl.certificate is not', () => {
    createElasticsearchConfig(config.schema.validate({ ssl: { key: 'some-path' } }), log);
    expect(loggingServiceMock.collect(logger).warn[0][0]).toMatchInlineSnapshot(
      `"Detected a key without a certificate; mutual TLS authentication is disabled."`
    );
  });

  it('warns if ssl.certificate is set and ssl.key is not', () => {
    createElasticsearchConfig(config.schema.validate({ ssl: { certificate: 'some-path' } }), log);
    expect(loggingServiceMock.collect(logger).warn[0][0]).toMatchInlineSnapshot(
      `"Detected a certificate without a key; mutual TLS authentication is disabled."`
    );
  });
});

test('#username throws if equal to "elastic", only while running from source', () => {
  const obj = {
    username: 'elastic',
  };
  expect(() => config.schema.validate(obj, { dist: false })).toThrowErrorMatchingSnapshot();
  expect(() => config.schema.validate(obj, { dist: true })).not.toThrow();
});
