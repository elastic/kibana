/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SemVer } from 'semver';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

import { MAJOR_VERSION } from '../common/constants';

const kibanaVersion = new SemVer(MAJOR_VERSION);

const baseSettings = {
  enabled: schema.boolean({ defaultValue: true }),
  ssl: schema.object({ verify: schema.boolean({ defaultValue: false }) }, {}),
};

// Settings only available in 7.x
const deprecatedSettings = {
  proxyFilter: schema.arrayOf(schema.string(), { defaultValue: ['.*'] }),
  proxyConfig: schema.arrayOf(
    schema.object({
      match: schema.object({
        protocol: schema.string({ defaultValue: '*' }),
        host: schema.string({ defaultValue: '*' }),
        port: schema.string({ defaultValue: '*' }),
        path: schema.string({ defaultValue: '*' }),
      }),

      timeout: schema.number(),
      ssl: schema.object(
        {
          verify: schema.boolean(),
          ca: schema.arrayOf(schema.string()),
          cert: schema.string(),
          key: schema.string(),
        },
        { defaultValue: undefined }
      ),
    }),
    { defaultValue: [] }
  ),
};

let configSchema = schema.object(
  {
    ...baseSettings,
  },
  { defaultValue: undefined }
);

if (kibanaVersion.major < 8) {
  // In 7.x we still support the "console.proxyFilter" and "console.proxyConfig" settings
  configSchema = schema.object(
    {
      ...baseSettings,
      ...deprecatedSettings,
    },
    { defaultValue: undefined }
  );
}

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  deprecations: ({ deprecate, unused }) => [
    deprecate('enabled', '8.0.0'),
    deprecate('proxyFilter', '8.0.0'),
    deprecate('proxyConfig', '8.0.0'),
    unused('ssl'),
  ],
};
