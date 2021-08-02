/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';
import { getConfigPath } from '@kbn/utils';
import { PluginConfigDescriptor } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { TELEMETRY_ENDPOINT } from '../common/constants';

const clusterEnvSchema: [Type<'prod'>, Type<'staging'>] = [
  schema.literal('prod'),
  schema.literal('staging'),
];

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  allowChangingOptInStatus: schema.boolean({ defaultValue: true }),
  optIn: schema.conditional(
    schema.siblingRef('allowChangingOptInStatus'),
    schema.literal(false),
    schema.maybe(schema.literal(true)),
    schema.boolean({ defaultValue: true }),
    { defaultValue: true }
  ),
  // `config` is used internally and not intended to be set
  config: schema.string({ defaultValue: getConfigPath() }),
  banner: schema.boolean({ defaultValue: true }),
  sendUsageTo: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.oneOf(clusterEnvSchema, { defaultValue: 'staging' }),
    schema.oneOf(clusterEnvSchema, { defaultValue: 'prod' })
  ),
  url: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.string({
      defaultValue: TELEMETRY_ENDPOINT.MAIN_CHANNEL.STAGING,
    }),
    schema.string({
      defaultValue: TELEMETRY_ENDPOINT.MAIN_CHANNEL.PROD,
    })
  ),
  optInStatusUrl: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(false), // Point to staging if it's not a distributable release
    schema.string({
      defaultValue: TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.STAGING,
    }),
    schema.string({
      defaultValue: TELEMETRY_ENDPOINT.OPT_IN_STATUS_CHANNEL.PROD,
    })
  ),
  sendUsageFrom: schema.oneOf([schema.literal('server'), schema.literal('browser')], {
    defaultValue: 'server',
  }),
});

export type TelemetryConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<TelemetryConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
    banner: true,
    allowChangingOptInStatus: true,
    optIn: true,
    sendUsageFrom: true,
    sendUsageTo: true,
  },
  deprecations: () => [
    (rawConfig, fromPath, addDeprecation) => {
      const telemetryConfig: TelemetryConfigType = rawConfig[fromPath];
      const unset: Array<{ path: string }> = [];
      const endpointConfigPaths = ['url', 'optInStatusUrl'] as const;
      let useStaging = telemetryConfig.sendUsageTo === 'staging' ? true : false;

      for (const configPath of endpointConfigPaths) {
        const configValue = telemetryConfig[configPath];
        const fullConfigPath = `telemetry.${configPath}`;
        if (typeof configValue !== 'undefined') {
          unset.push({ path: fullConfigPath });

          if (/telemetry-staging\.elastic\.co/i.test(configValue)) {
            useStaging = true;
          }

          addDeprecation({
            message: i18n.translate('telemetry.config.url.deprecationMessage', {
              defaultMessage:
                '"{{configPath}}" has been deprecated. Set "telemetry.sendUsageTo: staging" to the Kibana configurations to send usage to the staging telemetry cluster.',
              values: { configPath: fullConfigPath },
            }),
            correctiveActions: {
              manualSteps: [
                i18n.translate('telemetry.config.url.deprecationManualStep1', {
                  defaultMessage: 'Remove "{{configPath}}" from the Kibana configuration',
                  values: { configPath: fullConfigPath },
                }),
                i18n.translate('telemetry.config.url.deprecationManualStep2', {
                  defaultMessage:
                    'To send usage to staging, add "telemetry.sendUsageTo: staging" to the Kibana configuration.',
                  values: { configPath: fullConfigPath },
                }),
              ],
            },
          });
        }
      }

      return {
        set: [{ path: 'telemetry.sendUsageTo', value: useStaging ? 'staging' : 'prod' }],
        unset,
      };
    },
  ],
};
