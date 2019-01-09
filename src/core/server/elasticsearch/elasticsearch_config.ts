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

import { schema, TypeOf } from '@kbn/config-schema';
import { get, has, set } from 'lodash';
import { DeprecationHelpers } from '../config/config_with_schema';
import { ClusterClientConfigOptions } from './cluster_client';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

const configSchema = schema.object({
  sniffOnStart: schema.boolean({ defaultValue: false }),
  sniffInterval: schema.oneOf([schema.duration(), schema.literal(false)], { defaultValue: false }),
  sniffOnConnectionFault: schema.boolean({ defaultValue: false }),
  hosts: schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })], {
    defaultValue: 'http://localhost:9200',
  }),
  preserveHost: schema.boolean({ defaultValue: true }),
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  requestHeadersWhitelist: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
    defaultValue: ['authorization'],
  }),
  customHeaders: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
  shardTimeout: schema.duration({ defaultValue: '30s' }),
  requestTimeout: schema.duration({ defaultValue: '30s' }),
  pingTimeout: schema.duration({ defaultValue: schema.siblingRef('requestTimeout') }),
  startupTimeout: schema.duration({ defaultValue: '5s' }),
  logQueries: schema.boolean({ defaultValue: false }),
  ssl: schema.object({
    verificationMode: schema.oneOf(
      [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
      { defaultValue: 'full' }
    ),
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
    ),
    certificate: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    keyPassphrase: schema.maybe(schema.string()),
    alwaysPresentCertificate: schema.boolean({ defaultValue: true }),
  }),
  apiVersion: schema.string({ defaultValue: 'master' }),
  healthCheck: schema.object({ delay: schema.duration({ defaultValue: 2500 }) }),
});

/** @internal */
export class ElasticsearchConfig {
  public static schema = configSchema;

  public static deprecations({ rename, custom }: DeprecationHelpers) {
    const sslVerify = custom((rawConfig, log) => {
      const sslSettings = get(rawConfig, 'ssl');

      if (!has(sslSettings, 'verify')) {
        return;
      }

      const verificationMode = get(sslSettings, 'verify') ? 'full' : 'none';
      set(sslSettings, 'verificationMode', verificationMode);
      // TODO unset(sslSettings, 'verify');

      log(
        'Config key "elasticsearch.ssl.verify" is deprecated. It has been replaced with "elasticsearch.ssl.verificationMode"'
      );
    });

    const url = custom((settings, log) => {
      const deprecatedUrl = get(settings, 'url');
      const hosts = get(settings, 'hosts.length');
      if (!deprecatedUrl) {
        return;
      }
      if (hosts) {
        log(
          'Deprecated config key "elasticsearch.url" conflicts with "elasticsearch.hosts".  Ignoring "elasticsearch.url"'
        );
      } else {
        set(settings, 'hosts', [deprecatedUrl]);
        log(
          'Config key "elasticsearch.url" is deprecated. It has been replaced with "elasticsearch.hosts"'
        );
      }
      // TODO unset(settings, 'url');
    });

    return [
      rename('ssl.ca', 'ssl.certificateAuthorities'),
      rename('ssl.cert', 'ssl.certificate'),
      url,
      sslVerify,
    ];
  }

  constructor(private readonly config: TypeOf<typeof configSchema>) {}

  /**
   * Config tailored for Elasticsearch client.
   */
  public toClientConfig(): ClusterClientConfigOptions {
    return {
      apiVersion: this.config.apiVersion,
      customHeaders: this.config.customHeaders,
      logQueries: this.config.logQueries,
      hosts: Array.isArray(this.config.hosts) ? this.config.hosts : [this.config.hosts],
      ssl: this.config.ssl,
      sniffInterval:
        this.config.sniffInterval === false
          ? this.config.sniffInterval
          : this.config.sniffInterval.asMilliseconds(),
      sniffOnStart: this.config.sniffOnStart,
      sniffOnConnectionFault: this.config.sniffOnConnectionFault,
      username: this.config.username,
      password: this.config.password,
      pingTimeout: this.config.pingTimeout.asMilliseconds(),
      requestTimeout: this.config.requestTimeout.asMilliseconds(),
    };
  }
}
