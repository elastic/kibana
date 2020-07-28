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

import { ByteSizeValue, schema, TypeOf } from '@kbn/config-schema';
import { hostname } from 'os';

import { CspConfigType, CspConfig, ICspConfig } from '../csp';
import { SslConfig, sslSchema } from './ssl_config';

const validBasePathRegex = /^\/.*[^\/]$/;
const uuidRegexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const match = (regex: RegExp, errorMsg: string) => (str: string) =>
  regex.test(str) ? undefined : errorMsg;

// before update to make sure it's in sync with validation rules in Legacy
// https://github.com/elastic/kibana/blob/master/src/legacy/server/config/schema.js
export const config = {
  path: 'server',
  schema: schema.object(
    {
      name: schema.string({ defaultValue: () => hostname() }),
      autoListen: schema.boolean({ defaultValue: true }),
      basePath: schema.maybe(
        schema.string({
          validate: match(validBasePathRegex, "must start with a slash, don't end with one"),
        })
      ),
      cors: schema.boolean({ defaultValue: false }),
      customResponseHeaders: schema.recordOf(schema.string(), schema.any(), {
        defaultValue: {},
      }),
      host: schema.string({
        defaultValue: 'localhost',
        hostname: true,
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
        whitelist: schema.arrayOf(
          schema.string({ validate: match(/^\//, 'must start with a slash') }),
          { defaultValue: [] }
        ),
      }),
    },
    {
      validate: (rawConfig) => {
        if (!rawConfig.basePath && rawConfig.rewriteBasePath) {
          return 'cannot use [rewriteBasePath] when [basePath] is not specified';
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
  public cors: boolean | { origin: string[] };
  public customResponseHeaders: Record<string, string | string[]>;
  public maxPayload: ByteSizeValue;
  public basePath?: string;
  public rewriteBasePath: boolean;
  public ssl: SslConfig;
  public compression: { enabled: boolean; referrerWhitelist?: string[] };
  public csp: ICspConfig;
  public xsrf: { disableProtection: boolean; whitelist: string[] };

  /**
   * @internal
   */
  constructor(rawHttpConfig: HttpConfigType, rawCspConfig: CspConfigType) {
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
    this.keepaliveTimeout = rawHttpConfig.keepaliveTimeout;
    this.socketTimeout = rawHttpConfig.socketTimeout;
    this.rewriteBasePath = rawHttpConfig.rewriteBasePath;
    this.ssl = new SslConfig(rawHttpConfig.ssl || {});
    this.compression = rawHttpConfig.compression;
    this.csp = new CspConfig(rawCspConfig);
    this.xsrf = rawHttpConfig.xsrf;
  }
}

const convertHeader = (entry: any): string => {
  return typeof entry === 'object' ? JSON.stringify(entry) : String(entry);
};
