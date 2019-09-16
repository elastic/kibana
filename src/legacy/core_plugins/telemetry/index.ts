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

import { resolve } from 'path';
import JoiNamespace from 'joi';
import { Server } from 'hapi';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import mappings from './mappings.json';
import { CONFIG_TELEMETRY, getConfigTelemetryDesc } from './common/constants';
import { getXpackConfigWithDeprecated } from './common/get_xpack_config_with_deprecated';
import { telemetryPlugin } from './server';

import {
  createLocalizationUsageCollector,
  createTelemetryUsageCollector,
  createUiMetricUsageCollector,
} from './server/collectors';

const ENDPOINT_VERSION = 'v2';

const telemetry = (kibana: any) => {
  return new kibana.Plugin({
    id: 'telemetry',
    configPrefix: 'telemetry',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],
    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        // `config` is used internally and not intended to be set
        config: Joi.string().default(Joi.ref('$defaultConfigPath')),
        banner: Joi.boolean().default(true),
        url: Joi.when('$dev', {
          is: true,
          then: Joi.string().default(
            `https://telemetry-staging.elastic.co/xpack/${ENDPOINT_VERSION}/send`
          ),
          otherwise: Joi.string().default(
            `https://telemetry.elastic.co/xpack/${ENDPOINT_VERSION}/send`
          ),
        }),
      }).default();
    },
    uiExports: {
      managementSections: ['plugins/telemetry/views/management'],
      uiSettingDefaults: {
        [CONFIG_TELEMETRY]: {
          name: i18n.translate('xpack.telemetry.telemetryConfigTitle', {
            defaultMessage: 'Telemetry opt-in',
          }),
          description: getConfigTelemetryDesc(),
          value: false,
          readonly: true,
        },
      },
      savedObjectSchemas: {
        telemetry: {
          isNamespaceAgnostic: true,
        },
      },
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          telemetryEnabled: getXpackConfigWithDeprecated(config, 'telemetry.enabled'),
          telemetryUrl: getXpackConfigWithDeprecated(config, 'telemetry.url'),
          telemetryBanner: getXpackConfigWithDeprecated(config, 'telemetry.banner'),
          telemetryOptedIn: null,
        };
      },
      hacks: ['plugins/telemetry/hacks/telemetry_init', 'plugins/telemetry/hacks/telemetry_opt_in'],
      mappings,
    },
    init(server: Server) {
      const initializerContext = {} as PluginInitializerContext;
      const coreSetup = ({
        http: { server },
      } as any) as CoreSetup;

      telemetryPlugin(initializerContext).setup(coreSetup);

      // register collectors
      server.usage.collectorSet.register(createLocalizationUsageCollector(server));
      server.usage.collectorSet.register(createTelemetryUsageCollector(server));
      server.usage.collectorSet.register(createUiMetricUsageCollector(server));
    },
  });
};

// eslint-disable-next-line import/no-default-export
export default telemetry;
