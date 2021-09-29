/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ConfigDeprecation } from 'kibana/server';
import type { TelemetryConfigType } from './config';

export const deprecateEndpointConfigs: ConfigDeprecation = (
  rawConfig,
  fromPath,
  addDeprecation
) => {
  const telemetryConfig: TelemetryConfigType = rawConfig[fromPath];
  if (!telemetryConfig) {
    return;
  }

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
        title: i18n.translate('telemetry.endpointConfigs.deprecationTitle', {
          defaultMessage: 'Setting "{configPath}" is deprecated',
          values: { configPath: fullConfigPath },
        }),
        message: i18n.translate('telemetry.endpointConfigs.deprecationMessage', {
          defaultMessage:
            '"{configPath}" has been deprecated. Set "telemetry.sendUsageTo: staging" to the Kibana configurations to send usage to the staging endpoint.',
          values: { configPath: fullConfigPath },
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('telemetry.endpointConfigs.deprecationManualStep1', {
              defaultMessage: 'Remove "{configPath}" from the Kibana configuration.',
              values: { configPath: fullConfigPath },
            }),
            i18n.translate('telemetry.endpointConfigs.deprecationManualStep2', {
              defaultMessage:
                'To send usage to the staging endpoint add "telemetry.sendUsageTo: staging" to the Kibana configuration.',
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
};
