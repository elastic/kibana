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
import { Duration } from 'moment';
import { readFileSync } from 'fs';
import { readPkcs12Keystore, readPkcs12Truststore } from '../../utils';
import { Logger } from '../logging';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

export const DEFAULT_API_VERSION = 'master';

export type ElasticsearchConfigType = TypeOf<typeof config.schema>;
type SslConfigSchema = ElasticsearchConfigType['ssl'];

export const config = {
  path: 'elasticsearch',
  schema: schema.object({
    sniffOnStart: schema.boolean({ defaultValue: false }),
    sniffInterval: schema.oneOf([schema.duration(), schema.literal(false)], {
      defaultValue: false,
    }),
    sniffOnConnectionFault: schema.boolean({ defaultValue: false }),
    hosts: schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })], {
      defaultValue: 'http://localhost:9200',
    }),
    preserveHost: schema.boolean({ defaultValue: true }),
    username: schema.maybe(
      schema.conditional(
        schema.contextRef('dist'),
        false,
        schema.string({
          validate: rawConfig => {
            if (rawConfig === 'elastic') {
              return (
                'value of "elastic" is forbidden. This is a superuser account that can obfuscate ' +
                'privilege-related issues. You should use the "kibana" user instead.'
              );
            }
          },
        }),
        schema.string()
      )
    ),
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
    ssl: schema.object(
      {
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
        keystore: schema.object({
          path: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
        }),
        truststore: schema.object({
          path: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
        }),
        alwaysPresentCertificate: schema.boolean({ defaultValue: false }),
      },
      {
        validate: rawConfig => {
          if (rawConfig.key && rawConfig.keystore.path) {
            return 'cannot use [key] when [keystore.path] is specified';
          }
          if (rawConfig.certificate && rawConfig.keystore.path) {
            return 'cannot use [certificate] when [keystore.path] is specified';
          }
        },
      }
    ),
    apiVersion: schema.string({ defaultValue: DEFAULT_API_VERSION }),
    healthCheck: schema.object({ delay: schema.duration({ defaultValue: 2500 }) }),
    ignoreVersionMismatch: schema.boolean({ defaultValue: false }),
  }),
};

export class ElasticsearchConfig {
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch.
   */
  public readonly healthCheckDelay: Duration;

  /**
   * Whether to allow kibana to connect to a non-compatible elasticsearch node.
   */
  public readonly ignoreVersionMismatch: boolean;

  /**
   * Version of the Elasticsearch (6.7, 7.1 or `master`) client will be connecting to.
   */
  public readonly apiVersion: string;

  /**
   * Specifies whether all queries to the client should be logged (status code,
   * method, query etc.).
   */
  public readonly logQueries: boolean;

  /**
   * Hosts that the client will connect to. If sniffing is enabled, this list will
   * be used as seeds to discover the rest of your cluster.
   */
  public readonly hosts: string[];

  /**
   * List of Kibana client-side headers to send to Elasticsearch when request
   * scoped cluster client is used. If this is an empty array then *no* client-side
   * will be sent.
   */
  public readonly requestHeadersWhitelist: string[];

  /**
   * Timeout after which PING HTTP request will be aborted and retried.
   */
  public readonly pingTimeout: Duration;

  /**
   * Timeout after which HTTP request will be aborted and retried.
   */
  public readonly requestTimeout: Duration;

  /**
   * Timeout for Elasticsearch to wait for responses from shards. Set to 0 to disable.
   */
  public readonly shardTimeout: Duration;

  /**
   * Specifies whether the client should attempt to detect the rest of the cluster
   * when it is first instantiated.
   */
  public readonly sniffOnStart: boolean;

  /**
   * Interval to perform a sniff operation and make sure the list of nodes is complete.
   * If `false` then sniffing is disabled.
   */
  public readonly sniffInterval: false | Duration;

  /**
   * Specifies whether the client should immediately sniff for a more current list
   * of nodes when a connection dies.
   */
  public readonly sniffOnConnectionFault: boolean;

  /**
   * If Elasticsearch is protected with basic authentication, this setting provides
   * the username that the Kibana server uses to perform its administrative functions.
   */
  public readonly username?: string;

  /**
   * If Elasticsearch is protected with basic authentication, this setting provides
   * the password that the Kibana server uses to perform its administrative functions.
   */
  public readonly password?: string;

  /**
   * Set of settings configure SSL connection between Kibana and Elasticsearch that
   * are required when `xpack.ssl.verification_mode` in Elasticsearch is set to
   * either `certificate` or `full`.
   */
  public readonly ssl: Pick<
    SslConfigSchema,
    Exclude<keyof SslConfigSchema, 'certificateAuthorities' | 'keystore' | 'truststore'>
  > & { certificateAuthorities?: string[] };

  /**
   * Header names and values to send to Elasticsearch with every request. These
   * headers cannot be overwritten by client-side headers and aren't affected by
   * `requestHeadersWhitelist` configuration.
   */
  public readonly customHeaders: ElasticsearchConfigType['customHeaders'];

  constructor(rawConfig: ElasticsearchConfigType, log: Logger) {
    this.ignoreVersionMismatch = rawConfig.ignoreVersionMismatch;
    this.apiVersion = rawConfig.apiVersion;
    this.logQueries = rawConfig.logQueries;
    this.hosts = Array.isArray(rawConfig.hosts) ? rawConfig.hosts : [rawConfig.hosts];
    this.requestHeadersWhitelist = Array.isArray(rawConfig.requestHeadersWhitelist)
      ? rawConfig.requestHeadersWhitelist
      : [rawConfig.requestHeadersWhitelist];
    this.pingTimeout = rawConfig.pingTimeout;
    this.requestTimeout = rawConfig.requestTimeout;
    this.shardTimeout = rawConfig.shardTimeout;
    this.sniffOnStart = rawConfig.sniffOnStart;
    this.sniffOnConnectionFault = rawConfig.sniffOnConnectionFault;
    this.sniffInterval = rawConfig.sniffInterval;
    this.healthCheckDelay = rawConfig.healthCheck.delay;
    this.username = rawConfig.username;
    this.password = rawConfig.password;
    this.customHeaders = rawConfig.customHeaders;

    const { alwaysPresentCertificate, keyPassphrase, verificationMode } = rawConfig.ssl;

    let key: string | undefined;
    let certificate: string | undefined;
    let certificateAuthorities: string[] | undefined;
    const addCAs = (ca: string[] | undefined) => {
      if (ca && ca.length) {
        certificateAuthorities = certificateAuthorities ? certificateAuthorities.concat(ca) : ca;
      }
    };

    if (rawConfig.ssl.keystore?.path) {
      const { key: k, cert, ca } = readPkcs12Keystore(
        rawConfig.ssl.keystore.path,
        rawConfig.ssl.keystore.password
      );
      if (!k && !cert) {
        log.warn(
          `Did not find key or certificate in keystore; mutual TLS authentication is disabled.`
        );
      }
      key = k;
      certificate = cert;
      addCAs(ca);
    } else {
      if (rawConfig.ssl.key) {
        key = readFile(rawConfig.ssl.key);
      }
      if (rawConfig.ssl.certificate) {
        certificate = readFile(rawConfig.ssl.certificate);
      }
    }

    if (rawConfig.ssl.truststore?.path) {
      const ca = readPkcs12Truststore(
        rawConfig.ssl.truststore.path,
        rawConfig.ssl.truststore.password
      );
      addCAs(ca);
    }

    const ca = rawConfig.ssl.certificateAuthorities;
    if (ca) {
      const parsed: string[] = [];
      const paths = Array.isArray(ca) ? ca : [ca];
      if (paths.length > 0) {
        for (const path of paths) {
          parsed.push(readFile(path));
        }
        addCAs(parsed);
      }
    }

    if (key && !certificate) {
      log.warn(`Detected a key without a certificate; mutual TLS authentication is disabled.`);
    } else if (certificate && !key) {
      log.warn(`Detected a certificate without a key; mutual TLS authentication is disabled.`);
    }

    this.ssl = {
      alwaysPresentCertificate,
      key,
      keyPassphrase,
      certificate,
      certificateAuthorities,
      verificationMode,
    };
  }
}

const readFile = (file: string) => {
  return readFileSync(file, 'utf8');
};
