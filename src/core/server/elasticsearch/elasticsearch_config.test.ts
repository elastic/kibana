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

import { ElasticsearchConfig } from './elasticsearch_config';

test('set correct defaults', () => {
  const config = new ElasticsearchConfig(ElasticsearchConfig.schema.validate({}));
  expect(config).toMatchInlineSnapshot(`
ElasticsearchConfig {
  "apiVersion": "master",
  "customHeaders": Object {},
  "healthCheckDelay": "PT2.5S",
  "hosts": Array [
    "http://localhost:9200",
  ],
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
    "alwaysPresentCertificate": true,
    "certificateAuthorities": undefined,
    "verificationMode": "full",
  },
  "username": undefined,
}
`);
});

test('#hosts accepts both string and array of strings', () => {
  let config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ hosts: 'http://some.host:1234' })
  );
  expect(config.hosts).toEqual(['http://some.host:1234']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ hosts: ['http://some.host:1234'] })
  );
  expect(config.hosts).toEqual(['http://some.host:1234']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({
      hosts: ['http://some.host:1234', 'https://some.another.host'],
    })
  );
  expect(config.hosts).toEqual(['http://some.host:1234', 'https://some.another.host']);
});

test('#requestHeadersWhitelist accepts both string and array of strings', () => {
  let config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ requestHeadersWhitelist: 'token' })
  );
  expect(config.requestHeadersWhitelist).toEqual(['token']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ requestHeadersWhitelist: ['token'] })
  );
  expect(config.requestHeadersWhitelist).toEqual(['token']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({
      requestHeadersWhitelist: ['token', 'X-Forwarded-Proto'],
    })
  );
  expect(config.requestHeadersWhitelist).toEqual(['token', 'X-Forwarded-Proto']);
});

test('#ssl.certificateAuthorities accepts both string and array of strings', () => {
  let config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ ssl: { certificateAuthorities: 'some-path' } })
  );
  expect(config.ssl.certificateAuthorities).toEqual(['some-path']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({ ssl: { certificateAuthorities: ['some-path'] } })
  );
  expect(config.ssl.certificateAuthorities).toEqual(['some-path']);

  config = new ElasticsearchConfig(
    ElasticsearchConfig.schema.validate({
      ssl: { certificateAuthorities: ['some-path', 'another-path'] },
    })
  );
  expect(config.ssl.certificateAuthorities).toEqual(['some-path', 'another-path']);
});
