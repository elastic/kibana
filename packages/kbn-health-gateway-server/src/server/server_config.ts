/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Duration } from 'moment';
import { schema, TypeOf, ByteSizeValue } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { ISslConfig, ICorsConfig, IHttpConfig } from '@kbn/server-http-tools';
import { sslSchema, SslConfig } from '@kbn/server-http-tools';

const configSchema = schema.object(
  {
    host: schema.string({
      defaultValue: 'localhost',
      hostname: true,
    }),
    port: schema.number({
      defaultValue: 3000,
    }),
    maxPayload: schema.byteSize({
      defaultValue: '1048576b',
    }),
    keepaliveTimeout: schema.number({
      defaultValue: 120000,
    }),
    shutdownTimeout: schema.duration({
      defaultValue: '30s',
      validate: (duration) => {
        const durationMs = duration.asMilliseconds();
        if (durationMs < 1000 || durationMs > 2 * 60 * 1000) {
          return 'the value should be between 1 second and 2 minutes';
        }
      },
    }),
    socketTimeout: schema.number({
      defaultValue: 120000,
    }),
    ssl: sslSchema,
  },
  {
    validate: (rawConfig) => {
      if (
        rawConfig.ssl.enabled &&
        rawConfig.ssl.redirectHttpFromPort !== undefined &&
        rawConfig.ssl.redirectHttpFromPort === rawConfig.port
      ) {
        return (
          'The health gateway does not accept http traffic to [port] when ssl is ' +
          'enabled (only https is allowed), so [ssl.redirectHttpFromPort] ' +
          `cannot be configured to the same value. Both are [${rawConfig.port}].`
        );
      }
    },
  }
);

export type ServerConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<ServerConfigType> = {
  path: 'server' as const,
  schema: configSchema,
};

export class ServerConfig implements IHttpConfig {
  host: string;
  port: number;
  maxPayload: ByteSizeValue;
  keepaliveTimeout: number;
  shutdownTimeout: Duration;
  socketTimeout: number;
  ssl: ISslConfig;
  cors: ICorsConfig;

  constructor(rawConfig: ServerConfigType) {
    this.host = rawConfig.host;
    this.port = rawConfig.port;
    this.maxPayload = rawConfig.maxPayload;
    this.keepaliveTimeout = rawConfig.keepaliveTimeout;
    this.shutdownTimeout = rawConfig.shutdownTimeout;
    this.socketTimeout = rawConfig.socketTimeout;
    this.ssl = new SslConfig(rawConfig.ssl);
    this.cors = {
      enabled: false,
      allowCredentials: false,
      allowOrigin: ['*'],
    };
  }
}
