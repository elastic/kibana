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
import { schema, TypeOf } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { IConfigService } from '@kbn/config';
import { Logger } from '@kbn/logging';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

const configSchema = schema.object({
  hosts: schema.arrayOf(hostURISchema, {
    minSize: 1,
  }),
  requestTimeout: schema.duration({ defaultValue: '30s' }),
  ssl: schema.object({
    verificationMode: schema.oneOf(
      [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
      { defaultValue: 'full' }
    ),
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
    ),
    certificate: schema.maybe(schema.string()),
  }),
});

type KibanaConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<KibanaConfigType> = {
  path: 'kibana' as const,
  schema: configSchema,
};

interface KibanaConfigDependencies {
  logger: Logger;
  config: IConfigService;
}

export class KibanaConfig {
  private readonly logger: Logger;
  private readonly config: KibanaConfigType;

  /**
   * Kibana hosts that the gateway will connect to.
   */
  public readonly hosts: string[];

  /**
   * Timeout after which HTTP requests to the Kibana hosts will be aborted.
   */
  public readonly requestTimeout: Duration;

  /**
   * Settings to configure SSL connection between the gateway and Kibana hosts.
   */
  public readonly ssl: SslConfig;

  constructor({ logger, config: configService }: KibanaConfigDependencies) {
    this.logger = logger.get('kibana-config');
    this.config = configService.atPathSync<KibanaConfigType>('kibana');

    this.hosts = this.config.hosts;
    this.requestTimeout = this.config.requestTimeout;

    const { verificationMode } = this.config.ssl;
    const { certificate, certificateAuthorities } = this.readKeyAndCerts();

    this.ssl = {
      certificate,
      certificateAuthorities,
      verificationMode,
    };
  }

  private readKeyAndCerts() {
    const certificate = this.config.ssl.certificate
      ? readFile(this.config.ssl.certificate)
      : undefined;

    if (certificate) {
      this.logger.debug(`Reading certificate: ${this.config.ssl.certificate}`);
    }

    const certificateAuthorities = [] as string[];
    const ca = this.config.ssl.certificateAuthorities || [];

    for (const path of Array.isArray(ca) ? ca : [ca]) {
      this.logger.debug(`Adding certificate authority: ${path}`);
      certificateAuthorities.push(readFile(path));
    }

    return {
      certificate,
      certificateAuthorities: certificateAuthorities.length ? certificateAuthorities : undefined,
    };
  }
}

interface SslConfig {
  verificationMode: 'none' | 'certificate' | 'full';
  certificate?: string;
  certificateAuthorities?: string[];
}

const readFile = (file: string) => readFileSync(file, 'utf8');
