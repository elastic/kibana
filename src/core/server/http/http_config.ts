/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ByteSizeValue, schema, TypeOf } from '@kbn/config-schema';
import { hostname } from 'os';
import url from 'url';

import { CspConfigType, CspConfig, ICspConfig } from '../csp';
import { ExternalUrlConfig, IExternalUrlConfig } from '../external_url';
import { SslConfig, sslSchema } from './ssl_config';

const validBasePathRegex = /^\/.*[^\/]$/;
const uuidRegexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hostURISchema = schema.uri({ scheme: ['http', 'https'] });
const match = (regex: RegExp, errorMsg: string) => (str: string) =>
  regex.test(str) ? undefined : errorMsg;

// before update to make sure it's in sync with validation rules in Legacy
// https://github.com/elastic/kibana/blob/master/src/legacy/server/config/schema.js
export const config = {
  path: 'server' as const,
  schema: schema.object(
    {
      name: schema.string({ defaultValue: () => hostname() }),
      autoListen: schema.boolean({ defaultValue: true }),
      publicBaseUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
      basePath: schema.maybe(
        schema.string({
          validate: match(validBasePathRegex, "must start with a slash, don't end with one"),
        })
      ),
      cors: schema.object(
        {
          enabled: schema.boolean({ defaultValue: false }),
          allowCredentials: schema.boolean({ defaultValue: false }),
          allowOrigin: schema.oneOf(
            [
              schema.arrayOf(hostURISchema, { minSize: 1 }),
              schema.arrayOf(schema.literal('*'), { minSize: 1, maxSize: 1 }),
            ],
            {
              defaultValue: ['*'],
            }
          ),
        },
        {
          validate(value) {
            if (value.allowCredentials === true && value.allowOrigin.includes('*')) {
              return 'Cannot specify wildcard origin "*" with "credentials: true". Please provide a list of allowed origins.';
            }
          },
        }
      ),
      customResponseHeaders: schema.recordOf(schema.string(), schema.any(), {
        defaultValue: {},
      }),
      host: schema.string({
        defaultValue: 'localhost',
        hostname: true,
        validate(value) {
          if (value === '0') {
            return 'value 0 is not a valid hostname (use "0.0.0.0" to bind to all interfaces)';
          }
        },
      }),
      maxPayload: schema.byteSize({
        defaultValue: '1048576b',
      }),
      port: schema.number({
        defaultValue: 5601,
      }),
      rewriteBasePath: schema.boolean({ defaultValue: false }),
      ssl: sslSchema,
      keepaliveTimeout: schema.number({
        defaultValue: 120000,
      }),
      socketTimeout: schema.number({
        defaultValue: 120000,
      }),
      compression: schema.object({
        enabled: schema.boolean({ defaultValue: true }),
        referrerWhitelist: schema.maybe(
          schema.arrayOf(
            schema.string({
              hostname: true,
            }),
            { minSize: 1 }
          )
        ),
      }),
      uuid: schema.maybe(
        schema.string({
          validate: match(uuidRegexp, 'must be a valid uuid'),
        })
      ),
      xsrf: schema.object({
        disableProtection: schema.boolean({ defaultValue: false }),
        allowlist: schema.arrayOf(
          schema.string({ validate: match(/^\//, 'must start with a slash') }),
          { defaultValue: [] }
        ),
      }),
      requestId: schema.object(
        {
          allowFromAnyIp: schema.boolean({ defaultValue: false }),
          ipAllowlist: schema.arrayOf(schema.ip(), { defaultValue: [] }),
        },
        {
          validate(value) {
            if (value.allowFromAnyIp === true && value.ipAllowlist?.length > 0) {
              return `allowFromAnyIp must be set to 'false' if any values are specified in ipAllowlist`;
            }
          },
        }
      ),
    },
    {
      validate: (rawConfig) => {
        if (!rawConfig.basePath && rawConfig.rewriteBasePath) {
          return 'cannot use [rewriteBasePath] when [basePath] is not specified';
        }

        if (rawConfig.publicBaseUrl) {
          const parsedUrl = url.parse(rawConfig.publicBaseUrl);
          if (parsedUrl.query || parsedUrl.hash || parsedUrl.auth) {
            return `[publicBaseUrl] may only contain a protocol, host, port, and pathname`;
          }
          if (parsedUrl.path !== (rawConfig.basePath ?? '/')) {
            return `[publicBaseUrl] must contain the [basePath]: ${parsedUrl.path} !== ${rawConfig.basePath}`;
          }
        }

        if (!rawConfig.compression.enabled && rawConfig.compression.referrerWhitelist) {
          return 'cannot use [compression.referrerWhitelist] when [compression.enabled] is set to false';
        }

        if (
          rawConfig.ssl.enabled &&
          rawConfig.ssl.redirectHttpFromPort !== undefined &&
          rawConfig.ssl.redirectHttpFromPort === rawConfig.port
        ) {
          return (
            'Kibana does not accept http traffic to [port] when ssl is ' +
            'enabled (only https is allowed), so [ssl.redirectHttpFromPort] ' +
            `cannot be configured to the same value. Both are [${rawConfig.port}].`
          );
        }
      },
    }
  ),
};
export type HttpConfigType = TypeOf<typeof config.schema>;

export class HttpConfig {
  public name: string;
  public autoListen: boolean;
  public host: string;
  public keepaliveTimeout: number;
  public socketTimeout: number;
  public port: number;
  public cors: {
    enabled: boolean;
    allowCredentials: boolean;
    allowOrigin: string[];
  };
  public customResponseHeaders: Record<string, string | string[]>;
  public maxPayload: ByteSizeValue;
  public basePath?: string;
  public publicBaseUrl?: string;
  public rewriteBasePath: boolean;
  public ssl: SslConfig;
  public compression: { enabled: boolean; referrerWhitelist?: string[] };
  public csp: ICspConfig;
  public externalUrl: IExternalUrlConfig;
  public xsrf: { disableProtection: boolean; allowlist: string[] };
  public requestId: { allowFromAnyIp: boolean; ipAllowlist: string[] };

  /**
   * @internal
   */
  constructor(
    rawHttpConfig: HttpConfigType,
    rawCspConfig: CspConfigType,
    rawExternalUrlConfig: ExternalUrlConfig
  ) {
    this.autoListen = rawHttpConfig.autoListen;
    this.host = rawHttpConfig.host;
    this.port = rawHttpConfig.port;
    this.cors = rawHttpConfig.cors;
    this.customResponseHeaders = Object.entries(rawHttpConfig.customResponseHeaders ?? {}).reduce(
      (headers, [key, value]) => {
        return {
          ...headers,
          [key]: Array.isArray(value) ? value.map((e) => convertHeader(e)) : convertHeader(value),
        };
      },
      {}
    );
    this.maxPayload = rawHttpConfig.maxPayload;
    this.name = rawHttpConfig.name;
    this.basePath = rawHttpConfig.basePath;
    this.publicBaseUrl = rawHttpConfig.publicBaseUrl;
    this.keepaliveTimeout = rawHttpConfig.keepaliveTimeout;
    this.socketTimeout = rawHttpConfig.socketTimeout;
    this.rewriteBasePath = rawHttpConfig.rewriteBasePath;
    this.ssl = new SslConfig(rawHttpConfig.ssl || {});
    this.compression = rawHttpConfig.compression;
    this.csp = new CspConfig(rawCspConfig);
    this.externalUrl = rawExternalUrlConfig;
    this.xsrf = rawHttpConfig.xsrf;
    this.requestId = rawHttpConfig.requestId;
  }
}

const convertHeader = (entry: any): string => {
  return typeof entry === 'object' ? JSON.stringify(entry) : String(entry);
};
