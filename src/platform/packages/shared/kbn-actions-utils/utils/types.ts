/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const customHostSettingsSchema = schema.object({
  url: schema.string({ minLength: 1 }),
  smtp: schema.maybe(
    schema.object({
      ignoreTLS: schema.maybe(schema.boolean()),
      requireTLS: schema.maybe(schema.boolean()),
    })
  ),
  ssl: schema.maybe(
    schema.object({
      verificationMode: schema.maybe(
        schema.oneOf(
          [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
          { defaultValue: 'full' }
        )
      ),
      certificateAuthoritiesFiles: schema.maybe(
        schema.oneOf([
          schema.string({ minLength: 1 }),
          schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        ])
      ),
      certificateAuthoritiesData: schema.maybe(schema.string({ minLength: 1 })),
    })
  ),
});

export type CustomHostSettings = TypeOf<typeof customHostSettingsSchema>;

export interface SSLSettings {
  verificationMode?: 'none' | 'certificate' | 'full';
  pfx?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  ca?: Buffer;
}

export interface ProxySettings {
  proxyUrl: string;
  proxyBypassHosts: Set<string> | undefined;
  proxyOnlyHosts: Set<string> | undefined;
  proxyHeaders?: Record<string, string>;
  proxySSLSettings: SSLSettings;
}
