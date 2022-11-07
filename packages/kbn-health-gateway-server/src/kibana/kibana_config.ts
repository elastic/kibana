/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import type { Duration } from 'moment';
import { schema, TypeOf } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

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

export type KibanaConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<KibanaConfigType> = {
  path: 'kibana' as const,
  schema: configSchema,
};

export class KibanaConfig {
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

  constructor(rawConfig: KibanaConfigType) {
    this.hosts = rawConfig.hosts;
    this.requestTimeout = rawConfig.requestTimeout;

    const { verificationMode } = rawConfig.ssl;
    const { certificate, certificateAuthorities } = readKeyAndCerts(rawConfig);

    this.ssl = {
      certificate,
      certificateAuthorities,
      verificationMode,
    };
  }
}

interface SslConfig {
  verificationMode: 'none' | 'certificate' | 'full';
  certificate?: string;
  certificateAuthorities?: string[];
}

const readKeyAndCerts = (rawConfig: KibanaConfigType) => {
  let certificate: string | undefined;
  let certificateAuthorities: string[] | undefined;

  const addCAs = (ca: string[] | undefined) => {
    if (ca && ca.length) {
      certificateAuthorities = [...(certificateAuthorities || []), ...ca];
    }
  };

  if (rawConfig.ssl.certificate) {
    certificate = readFile(rawConfig.ssl.certificate);
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
    certificate,
    certificateAuthorities,
  };
};

const readFile = (file: string) => readFileSync(file, 'utf8');
