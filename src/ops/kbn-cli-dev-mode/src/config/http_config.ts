/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue, schema, TypeOf } from '@kbn/config-schema';
import { ICorsConfig, IHttpConfig, ISslConfig, SslConfig, sslSchema } from '@kbn/server-http-tools';
import { Duration } from 'moment';

export const httpConfigSchema = schema.object(
  {
    host: schema.string({
      defaultValue: 'localhost',
      hostname: true,
    }),
    basePath: schema.maybe(schema.string()),
    port: schema.number({
      defaultValue: 5601,
    }),
    maxPayload: schema.byteSize({
      defaultValue: '1048576b',
    }),
    shutdownTimeout: schema.duration({ defaultValue: '30s' }),
    keepaliveTimeout: schema.number({
      defaultValue: 120000,
    }),
    socketTimeout: schema.number({
      defaultValue: 120000,
    }),
    cors: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      allowCredentials: schema.boolean({ defaultValue: false }),
      allowOrigin: schema.arrayOf(schema.string(), {
        defaultValue: ['*'],
      }),
    }),
    ssl: sslSchema,
  },
  { unknowns: 'ignore' }
);

export type HttpConfigType = TypeOf<typeof httpConfigSchema>;

export class HttpConfig implements IHttpConfig {
  basePath?: string;
  host: string;
  port: number;
  maxPayload: ByteSizeValue;
  shutdownTimeout: Duration;
  keepaliveTimeout: number;
  socketTimeout: number;
  cors: ICorsConfig;
  ssl: ISslConfig;

  constructor(rawConfig: HttpConfigType) {
    this.basePath = rawConfig.basePath;
    this.host = rawConfig.host;
    this.port = rawConfig.port;
    this.maxPayload = rawConfig.maxPayload;
    this.shutdownTimeout = rawConfig.shutdownTimeout;
    this.keepaliveTimeout = rawConfig.keepaliveTimeout;
    this.socketTimeout = rawConfig.socketTimeout;
    this.cors = rawConfig.cors;
    this.ssl = new SslConfig(rawConfig.ssl);
  }
}
