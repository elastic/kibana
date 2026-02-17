/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import type { Duration } from 'moment';
import { readPkcs12Keystore, readPkcs12Truststore } from '@kbn/crypto';
import { i18n } from '@kbn/i18n';
import type { ByteSizeValue, Type } from '@kbn/config-schema';
import { schema, offeringBasedSchema, type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { ConfigDeprecationProvider } from '@kbn/config';
import type {
  IElasticsearchConfig,
  ElasticsearchSslConfig,
  ElasticsearchApiToRedactInLogs,
} from '@kbn/core-elasticsearch-server';
import { getReservedHeaders } from './default_headers';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

export const DEFAULT_API_VERSION = 'master';

export const DEFAULT_HEALTH_CHECK_RETRY = 3;

export type ElasticsearchConfigType = TypeOf<typeof configSchema>;

const requestHeadersWhitelistSchemas = [
  schema.string({
    // can't use `validate` option on union types, forced to validate each individual subtypes
    // see https://github.com/elastic/kibana/issues/64906
    validate: (headersWhitelist) => {
      const reservedHeaders = getReservedHeaders([headersWhitelist]);
      if (reservedHeaders.length) {
        return `cannot use reserved headers: [${reservedHeaders.join(', ')}]`;
      }
    },
  }),
  schema.arrayOf(schema.string(), {
    // can't use `validate` option on union types, forced to validate each individual subtypes
    // see https://github.com/elastic/kibana/issues/64906
    validate: (headersWhitelist) => {
      const reservedHeaders = getReservedHeaders(headersWhitelist);
      if (reservedHeaders.length) {
        return `cannot use reserved headers: [${reservedHeaders.join(', ')}]`;
      }
    },
  }),
] as [Type<string>, Type<string[]>];

/**
 * Validation schema for elasticsearch service config. It can be reused when plugins allow users
 * to specify a local elasticsearch config.
 * @public
 */
export const configSchema = schema.object({
  sniffOnStart: schema.boolean({ defaultValue: false }),
  sniffInterval: schema.oneOf([schema.duration(), schema.literal(false)], {
    defaultValue: false,
  }),
  sniffOnConnectionFault: schema.boolean({ defaultValue: false }),
  hosts: schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })], {
    defaultValue: 'http://localhost:9200',
  }),
  maxSockets: schema.number({ defaultValue: 800, min: 1 }),
  maxIdleSockets: schema.number({ defaultValue: 256, min: 1 }),
  maxResponseSize: schema.oneOf([schema.literal(false), schema.byteSize()], {
    defaultValue: false,
  }),
  idleSocketTimeout: schema.duration({ defaultValue: '60s' }),
  compression: schema.boolean({ defaultValue: false }),
  username: schema.maybe(
    schema.string({
      validate: (rawConfig) => {
        if (rawConfig === 'elastic') {
          return (
            'value of "elastic" is forbidden. This is a superuser account that cannot write to system indices that Kibana needs to ' +
            'function. Use a service account token instead. Learn more: ' +
            'https://www.elastic.co/guide/en/elasticsearch/reference/8.0/service-accounts.html' // we don't have a way to pass a branch into the config schema; hardcoding this one link to the 8.0 docs is OK
          );
        }
      },
    })
  ),
  password: schema.maybe(schema.string({ coerceFromNumber: true })),
  serviceAccountToken: schema.maybe(
    schema.conditional(
      schema.siblingRef('username'),
      schema.never(),
      schema.string(),
      schema.string({
        validate: () => {
          return `serviceAccountToken cannot be specified when "username" is also set.`;
        },
      })
    )
  ),
  requestHeadersWhitelist: offeringBasedSchema({
    serverless: schema.oneOf(requestHeadersWhitelistSchemas, {
      defaultValue: ['authorization', 'es-client-authentication', 'x-client-authentication'],
    }),
    traditional: schema.oneOf(requestHeadersWhitelistSchemas, {
      defaultValue: ['authorization', 'es-client-authentication'],
    }),
  }),
  customHeaders: schema.recordOf(schema.string(), schema.string(), {
    defaultValue: {},
    validate: (customHeaders) => {
      const reservedHeaders = getReservedHeaders(Object.keys(customHeaders));
      if (reservedHeaders.length) {
        return `cannot use reserved headers: [${reservedHeaders.join(', ')}]`;
      }
    },
  }),
  shardTimeout: schema.duration({ defaultValue: '30s' }),
  requestTimeout: schema.duration({ defaultValue: '30s' }),
  pingTimeout: schema.duration({ defaultValue: schema.siblingRef('requestTimeout') }),
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
      validate: (rawConfig) => {
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
  healthCheck: schema.object({
    delay: schema.duration({ defaultValue: 2500 }),
    onFailureDelay: schema.maybe(schema.duration()),
    startupDelay: schema.duration({ defaultValue: 500 }),
    retry: schema.number({ defaultValue: DEFAULT_HEALTH_CHECK_RETRY, min: 1 }),
  }),
  ignoreVersionMismatch: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: true }),
    traditional: schema.conditional(
      schema.contextRef('dev'),
      false,
      schema.boolean({
        validate: (rawValue) => {
          if (rawValue === true) {
            return '"ignoreVersionMismatch" can only be set to true in development mode';
          }
        },
        defaultValue: false,
      }),
      schema.boolean({ defaultValue: false })
    ),
  }),
  skipStartupConnectionCheck: schema.conditional(
    // Using dist over dev because integration_tests run with dev: false,
    // and this config is solely introduced to allow some of the integration tests to run without an ES server.
    schema.contextRef('dist'),
    true,
    schema.boolean({
      validate: (rawValue) => {
        if (rawValue === true) {
          return '"skipStartupConnectionCheck" can only be set to true when running from source to allow integration tests to run without an ES server';
        }
      },
      defaultValue: false,
    }),
    schema.boolean({ defaultValue: false })
  ),
  apisToRedactInLogs: schema.arrayOf(
    schema.object({
      path: schema.string(),
      method: schema.maybe(schema.string()),
    }),
    { defaultValue: [] }
  ),
  dnsCacheTtl: schema.duration({ defaultValue: 0, min: 0 }),
  publicBaseUrl: schema.maybe(hostURISchema),
});

const deprecations: ConfigDeprecationProvider = () => [
  (settings, fromPath, addDeprecation, { branch }) => {
    const es = settings[fromPath];
    if (!es) {
      return;
    }

    if (es.username === 'kibana') {
      const username = es.username;
      addDeprecation({
        configPath: `${fromPath}.username`,
        title: i18n.translate('core.deprecations.elasticsearchUsername.title', {
          defaultMessage: 'Using "elasticsearch.username: {username}" is deprecated',
          values: { username },
        }),
        message: i18n.translate('core.deprecations.elasticsearchUsername.message', {
          defaultMessage:
            'Kibana is configured to authenticate to Elasticsearch with the "{username}" user. Use a service account token instead.',
          values: { username },
        }),
        level: 'warning',
        documentationUrl: `https://www.elastic.co/guide/en/elasticsearch/reference/${branch}/service-accounts.html`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('core.deprecations.elasticsearchUsername.manualSteps1', {
              defaultMessage:
                'Use the elasticsearch-service-tokens CLI tool to create a new service account token for the "elastic/kibana" service account.',
            }),
            i18n.translate('core.deprecations.elasticsearchUsername.manualSteps2', {
              defaultMessage: 'Add the "elasticsearch.serviceAccountToken" setting to kibana.yml.',
            }),
            i18n.translate('core.deprecations.elasticsearchUsername.manualSteps3', {
              defaultMessage:
                'Remove "elasticsearch.username" and "elasticsearch.password" from kibana.yml.',
            }),
          ],
        },
      });
    }

    const addSslDeprecation = (existingSetting: string, missingSetting: string) => {
      addDeprecation({
        configPath: existingSetting,
        title: i18n.translate('core.deprecations.elasticsearchSSL.title', {
          defaultMessage: 'Using "{existingSetting}" without "{missingSetting}" has no effect',
          values: { existingSetting, missingSetting },
        }),
        message: i18n.translate('core.deprecations.elasticsearchSSL.message', {
          defaultMessage:
            'Use both "{existingSetting}" and "{missingSetting}" to enable Kibana to use Mutual TLS authentication with Elasticsearch.',
          values: { existingSetting, missingSetting },
        }),
        level: 'warning',
        documentationUrl: `https://www.elastic.co/guide/en/kibana/${branch}/elasticsearch-mutual-tls.html`,
        correctiveActions: {
          manualSteps: [
            i18n.translate('core.deprecations.elasticsearchSSL.manualSteps1', {
              defaultMessage: 'Add the "{missingSetting}" setting to kibana.yml.',
              values: { missingSetting },
            }),
            i18n.translate('core.deprecations.elasticsearchSSL.manualSteps2', {
              defaultMessage:
                'Alternatively, if you don\'t want to use Mutual TLS authentication, remove "{existingSetting}" from kibana.yml.',
              values: { existingSetting },
            }),
          ],
        },
      });
    };

    if (es.ssl?.key !== undefined && es.ssl?.certificate === undefined) {
      addSslDeprecation(`${fromPath}.ssl.key`, `${fromPath}.ssl.certificate`);
    } else if (es.ssl?.certificate !== undefined && es.ssl?.key === undefined) {
      addSslDeprecation(`${fromPath}.ssl.certificate`, `${fromPath}.ssl.key`);
    }

    if (es.logQueries === true) {
      addDeprecation({
        configPath: `${fromPath}.logQueries`,
        level: 'warning',
        message: `Setting [${fromPath}.logQueries] is deprecated and no longer used. You should set the log level to "debug" for the "elasticsearch.query" context in "logging.loggers".`,
        correctiveActions: {
          manualSteps: [
            `Remove Setting [${fromPath}.logQueries] from your kibana configs`,
            `Set the log level to "debug" for the "elasticsearch.query" context in "logging.loggers".`,
          ],
        },
      });
    }

    if (es.pingTimeout !== undefined) {
      addDeprecation({
        configPath: `${fromPath}.pingTimeout`,
        title: i18n.translate('core.deprecations.elasticsearchPingTimeout.title', {
          defaultMessage: 'Setting "{pingTimeoutSetting}" is deprecated',
          values: { pingTimeoutSetting: `${fromPath}.pingTimeout` },
        }),
        level: 'warning',
        message: i18n.translate('core.deprecations.elasticsearchPingTimeout.message', {
          defaultMessage:
            'Setting "{pingTimeoutSetting}" is deprecated and no longer used. Use "{requestTimeoutSetting}" instead.',
          values: {
            pingTimeoutSetting: `${fromPath}.pingTimeout`,
            requestTimeoutSetting: `${fromPath}.requestTimeout`,
          },
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('core.deprecations.elasticsearchPingTimeout.manualSteps1', {
              defaultMessage: 'Remove Setting [{pingTimeoutSetting}] from your kibana configs.',
              values: { pingTimeoutSetting: `${fromPath}.pingTimeout` },
            }),
          ],
        },
      });
    }
    return;
  },
];

export const config: ServiceConfigDescriptor<ElasticsearchConfigType> = {
  path: 'elasticsearch',
  schema: configSchema,
  deprecations,
};

/**
 * Wrapper of config schema.
 * @internal
 */
export class ElasticsearchConfig implements IElasticsearchConfig {
  /**
   * @internal
   * Only valid in dev mode. Skip the valid connection check during startup. The connection check allows
   * Kibana to ensure that the Elasticsearch connection is valid before allowing
   * any other services to be set up.
   *
   * @remarks
   * You should disable this check at your own risk: Other services in Kibana
   * may fail if this step is not completed.
   */
  public readonly skipStartupConnectionCheck: boolean;
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch before the first green signal.
   */
  public readonly healthCheckStartupDelay: Duration;
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch after the first green signal.
   */
  public readonly healthCheckDelay: Duration;
  /**
   * The interval between health check requests Kibana sends to the Elasticsearch during failure.
   */
  public readonly healthCheckFailureInterval: Duration | undefined;
  /**
   * The number of times to retry the health check request
   */
  public readonly healthCheckRetry: number;
  /**
   * Whether to allow kibana to connect to a non-compatible elasticsearch node.
   */
  public readonly ignoreVersionMismatch: boolean;

  /**
   * Version of the Elasticsearch (6.7, 7.1 or `master`) client will be connecting to.
   */
  public readonly apiVersion: string;

  /**
   * The maximum number of sockets that can be used for communications with elasticsearch.
   */
  public readonly maxSockets: number;

  /**
   * The maximum number of idle sockets to keep open between Kibana and Elasticsearch. If more sockets become idle, they will be closed.
   */
  public readonly maxIdleSockets: number;

  /**
   * The maximum allowed response size (both compressed and uncompressed).
   * When defined, responses with a size higher than the set limit will be aborted with an error.
   */
  public readonly maxResponseSize?: ByteSizeValue;

  /**
   * The timeout for idle sockets kept open between Kibana and Elasticsearch. If the socket is idle for longer than this timeout, it will be closed.
   */
  public readonly idleSocketTimeout: Duration;

  /**
   * Whether to use compression for communications with elasticsearch.
   */
  public readonly compression: boolean;

  /**
   * Hosts that the client will connect to. If sniffing is enabled, this list will
   * be used as seeds to discover the rest of your cluster.
   */
  public readonly hosts: string[];

  /**
   * Optional host that users can use to connect to your Elasticsearch cluster,
   * this URL will be shown in Kibana as the Elasticsearch URL
   */

  public readonly publicBaseUrl?: string;

  /**
   * List of Kibana client-side headers to send to Elasticsearch when request
   * scoped cluster client is used. If this is an empty array then *no* client-side
   * will be sent.
   */
  public readonly requestHeadersWhitelist: string[];

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
   * Cannot be used in conjunction with serviceAccountToken.
   */
  public readonly username?: string;

  /**
   * If Elasticsearch is protected with basic authentication, this setting provides
   * the password that the Kibana server uses to perform its administrative functions.
   */
  public readonly password?: string;

  /**
   * If Elasticsearch security features are enabled, this setting provides the service account
   * token that the Kibana server users to perform its administrative functions.
   *
   * This is an alternative to specifying a username and password.
   */
  public readonly serviceAccountToken?: string;

  /**
   * Set of settings configure SSL connection between Kibana and Elasticsearch that
   * are required when `xpack.ssl.verification_mode` in Elasticsearch is set to
   * either `certificate` or `full`.
   */
  public readonly ssl: ElasticsearchSslConfig;

  /**
   * Header names and values to send to Elasticsearch with every request. These
   * headers cannot be overwritten by client-side headers and aren't affected by
   * `requestHeadersWhitelist` configuration.
   */
  public readonly customHeaders: ElasticsearchConfigType['customHeaders'];

  /**
   * Extends the list of APIs that should be redacted in logs.
   */
  public readonly apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];

  /**
   * The maximum time to retain the DNS lookup resolutions.
   * Set to 0 to disable the cache (default Node.js behavior)
   */
  public readonly dnsCacheTtl: Duration;

  constructor(rawConfig: ElasticsearchConfigType) {
    this.ignoreVersionMismatch = rawConfig.ignoreVersionMismatch;
    this.apiVersion = rawConfig.apiVersion;
    this.hosts = Array.isArray(rawConfig.hosts) ? rawConfig.hosts : [rawConfig.hosts];
    this.requestHeadersWhitelist = Array.isArray(rawConfig.requestHeadersWhitelist)
      ? rawConfig.requestHeadersWhitelist
      : [rawConfig.requestHeadersWhitelist];
    this.requestTimeout = rawConfig.requestTimeout;
    this.shardTimeout = rawConfig.shardTimeout;
    this.sniffOnStart = rawConfig.sniffOnStart;
    this.sniffOnConnectionFault = rawConfig.sniffOnConnectionFault;
    this.sniffInterval = rawConfig.sniffInterval;
    this.healthCheckDelay = rawConfig.healthCheck.delay;
    this.healthCheckFailureInterval = rawConfig.healthCheck.onFailureDelay;
    this.healthCheckStartupDelay = rawConfig.healthCheck.startupDelay;
    this.healthCheckRetry = rawConfig.healthCheck.retry;
    this.username = rawConfig.username;
    this.password = rawConfig.password;
    this.serviceAccountToken = rawConfig.serviceAccountToken;
    this.customHeaders = rawConfig.customHeaders;
    this.maxSockets = rawConfig.maxSockets;
    this.maxIdleSockets = rawConfig.maxIdleSockets;
    this.maxResponseSize =
      rawConfig.maxResponseSize !== false ? rawConfig.maxResponseSize : undefined;
    this.idleSocketTimeout = rawConfig.idleSocketTimeout;
    this.compression = rawConfig.compression;
    this.skipStartupConnectionCheck = rawConfig.skipStartupConnectionCheck;
    this.apisToRedactInLogs = rawConfig.apisToRedactInLogs;
    this.dnsCacheTtl = rawConfig.dnsCacheTtl;
    this.publicBaseUrl = rawConfig.publicBaseUrl;

    const { alwaysPresentCertificate, verificationMode } = rawConfig.ssl;
    const { key, keyPassphrase, certificate, certificateAuthorities } = readKeyAndCerts(rawConfig);

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

const readKeyAndCerts = (rawConfig: ElasticsearchConfigType) => {
  let key: string | undefined;
  let keyPassphrase: string | undefined;
  let certificate: string | undefined;
  let certificateAuthorities: string[] | undefined;

  const readFile = (file: string) => {
    return readFileSync(file, 'utf8');
  };

  const addCAs = (ca: string[] | undefined) => {
    if (ca && ca.length) {
      certificateAuthorities = [...(certificateAuthorities || []), ...ca];
    }
  };

  if (rawConfig.ssl.keystore?.path) {
    const keystore = readPkcs12Keystore(
      rawConfig.ssl.keystore.path,
      rawConfig.ssl.keystore.password
    );
    if (!keystore.key) {
      throw new Error(`Did not find key in Elasticsearch keystore.`);
    } else if (!keystore.cert) {
      throw new Error(`Did not find certificate in Elasticsearch keystore.`);
    }
    key = keystore.key;
    certificate = keystore.cert;
    addCAs(keystore.ca);
  } else {
    if (rawConfig.ssl.key) {
      key = readFile(rawConfig.ssl.key);
      keyPassphrase = rawConfig.ssl.keyPassphrase;
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

  return {
    key,
    keyPassphrase,
    certificate,
    certificateAuthorities,
  };
};
