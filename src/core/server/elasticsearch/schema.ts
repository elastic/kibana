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

import { schema } from '@kbn/utils';

/**
 * @internal
 */
export const sslSchema = schema.object({
  certificate: schema.maybe(schema.string()),
  certificateAuthorities: schema.maybe(
    schema.arrayOf(schema.string(), { minSize: 1 })
  ),
  key: schema.maybe(schema.string()),
  keyPassphrase: schema.maybe(schema.string()),
  verificationMode: schema.oneOf([
    schema.literal('none'),
    schema.literal('certificate'),
    schema.literal('full'),
  ]),
});

const DEFAULT_REQUEST_HEADERS = ['authorization'];

/**
 * @internal
 */
const sharedElasticsearchFields = {
  apiVersion: schema.string({ defaultValue: 'master' }),
  customHeaders: schema.maybe(schema.object({})),
  logQueries: schema.boolean({ defaultValue: false }),
  password: schema.maybe(schema.string()),
  pingTimeout: schema.duration({ defaultValue: '30s' }),
  preserveHost: schema.boolean({ defaultValue: true }),
  requestHeadersWhitelist: schema.arrayOf(schema.string(), {
    defaultValue: DEFAULT_REQUEST_HEADERS,
  }),
  requestTimeout: schema.duration({ defaultValue: '30s' }),
  shardTimeout: schema.duration({ defaultValue: '30s' }),
  ssl: schema.maybe(sslSchema),
  startupTimeout: schema.duration({ defaultValue: '5s' }),
  url: schema.string({ defaultValue: 'http://localhost:9200' }),
  username: schema.maybe(schema.string()),
};

/**
 * @internal
 */
const clusterSchema = schema.object({
  ...sharedElasticsearchFields,
});

/**
 * @internal
 */
export const tribeSchema = schema.object({
  ...sharedElasticsearchFields,
});

/**
 * @internal
 */
export const elasticsearchSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  ...sharedElasticsearchFields,
  healthCheck: schema.object({
    delay: schema.duration({ defaultValue: '2500ms' }),
  }),
  tribe: schema.maybe(tribeSchema),
});

/**
 * @internal
 */
export type ElasticsearchConfigsSchema = schema.TypeOf<
  typeof elasticsearchSchema
>;

/**
 * @internal
 */
export type ClusterSchema = schema.TypeOf<typeof clusterSchema>;
