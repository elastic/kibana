/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';
import { getConfigPath } from '@kbn/utils';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { labelsSchema } from './telemetry_labels';

const clusterEnvSchema: [Type<'prod'>, Type<'staging'>] = [
  schema.literal('prod'),
  schema.literal('staging'),
];

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  allowChangingOptInStatus: schema.boolean({ defaultValue: true }),
  hidePrivacyStatement: schema.boolean({ defaultValue: false }),
  optIn: schema.boolean({ defaultValue: true }),
  // `config` is used internally and not intended to be set
  config: schema.string({ defaultValue: getConfigPath() }),
  banner: schema.boolean({ defaultValue: true }),
  sendUsageTo: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.oneOf(clusterEnvSchema, { defaultValue: 'staging' }),
    schema.oneOf(clusterEnvSchema, { defaultValue: 'prod' })
  ),
  sendUsageFrom: schema.oneOf([schema.literal('server'), schema.literal('browser')], {
    defaultValue: 'server',
  }),
  // Used for extra enrichment of telemetry
  labels: labelsSchema,
});

export type TelemetryConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<TelemetryConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    banner: true,
    allowChangingOptInStatus: true,
    optIn: true,
    sendUsageFrom: true,
    sendUsageTo: true,
    hidePrivacyStatement: true,
    labels: true,
  },
  deprecations: () => [
    (cfg) => {
      if (cfg.telemetry?.enabled === false) {
        return {
          set: [
            { path: 'telemetry.optIn', value: false },
            { path: 'telemetry.allowChangingOptInStatus', value: false },
          ],
          unset: [{ path: 'telemetry.enabled' }],
        };
      }
    },
  ],
};
