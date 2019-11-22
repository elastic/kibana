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
import { Env } from '../config';
import { DEFAULT_CSP_RULES, DEFAULT_CSP_STRICT, DEFAULT_CSP_WARN_LEGACY_BROWSERS } from '../csp';
import { SslConfig, sslSchema } from './ssl_config';

const validBasePathRegex = /(^$|^\/.*[^\/]$)/;

const match = (regex: RegExp, errorMsg: string) => (str: string) =>
  regex.test(str) ? undefined : errorMsg;

// before update to make sure it's in sync with validation rules in Legacy
// https://github.com/elastic/kibana/blob/master/src/legacy/server/config/schema.js
export const config = {
  path: 'server',
  schema: schema.object(
    {
      autoListen: schema.boolean({ defaultValue: true }),
      basePath: schema.maybe(
        schema.string({
          validate: match(validBasePathRegex, "must start with a slash, don't end with one"),
        })
      ),
      csp: schema.object(
        {
          rules: schema.arrayOf(schema.string()),
          strict: schema.boolean(),
          warnLegacyBrowsers: schema.boolean(),
        },
        {
          defaultValue: {
            rules: [...DEFAULT_CSP_RULES],
            strict: DEFAULT_CSP_STRICT,
            warnLegacyBrowsers: DEFAULT_CSP_WARN_LEGACY_BROWSERS,
          },
        }
      ),
      cors: schema.conditional(
        schema.contextRef('dev'),
        true,
        schema.object(
          {
            origin: schema.arrayOf(schema.string()),
          },
          {
            defaultValue: {
              origin: ['*://localhost:9876'], // karma test server
            },
          }
        ),
        schema.boolean({ defaultValue: false })
      ),
      defaultRoute: schema.maybe(schema.string()),
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
    },
    {
      validate: rawConfig => {
        if (!rawConfig.basePath && rawConfig.rewriteBasePath) {
          return 'cannot use [rewriteBasePath] when [basePath] is not specified';
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
  public autoListen: boolean;
  public host: string;
  public keepaliveTimeout: number;
  public socketTimeout: number;
  public port: number;
  public csp: HttpConfigType['csp'];
  public cors: boolean | { origin: string[] };
  public maxPayload: ByteSizeValue;
  public basePath?: string;
  public rewriteBasePath: boolean;
  public publicDir: string;
  public defaultRoute?: string;
  public ssl: SslConfig;

  /**
   * @internal
   */
  constructor(rawConfig: HttpConfigType, env: Env) {
    this.autoListen = rawConfig.autoListen;
    this.host = rawConfig.host;
    this.port = rawConfig.port;
    this.csp = rawConfig.csp;
    this.cors = rawConfig.cors;
    this.maxPayload = rawConfig.maxPayload;
    this.basePath = rawConfig.basePath;
    this.keepaliveTimeout = rawConfig.keepaliveTimeout;
    this.socketTimeout = rawConfig.socketTimeout;
    this.rewriteBasePath = rawConfig.rewriteBasePath;
    this.publicDir = env.staticFilesDir;
    this.ssl = new SslConfig(rawConfig.ssl || {});
    this.defaultRoute = rawConfig.defaultRoute;
  }
}
