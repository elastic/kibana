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
        "certificateAuthorities": undefined,
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

test('#ssl.certificateAuthorities accepts both string and array of strings', () => {
  let configValue = createElasticsearchConfig(
    config.schema.validate({ ssl: { certificateAuthorities: 'some-path' } })
  );
  expect(configValue.ssl.certificateAuthorities).toEqual(['some-path']);

  configValue = createElasticsearchConfig(
    config.schema.validate({ ssl: { certificateAuthorities: ['some-path'] } })
  );
  expect(configValue.ssl.certificateAuthorities).toEqual(['some-path']);

  configValue = createElasticsearchConfig(
    config.schema.validate({
      ssl: { certificateAuthorities: ['some-path', 'another-path'] },
    })
  );
  expect(configValue.ssl.certificateAuthorities).toEqual(['some-path', 'another-path']);
});

test('#username throws if equal to "elastic", only while running from source', () => {
  const obj = {
    username: 'elastic',
  };
  expect(() => config.schema.validate(obj, { dist: false })).toThrowErrorMatchingSnapshot();
  expect(() => config.schema.validate(obj, { dist: true })).not.toThrow();
});
