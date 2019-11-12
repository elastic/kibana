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

import * as Rx from 'rxjs';
import { resolve } from 'path';
import JoiNamespace from 'joi';
import { Server } from 'hapi';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import mappings from './mappings.json';
import { CONFIG_TELEMETRY, getConfigTelemetryDesc } from './common/constants';
import { getXpackConfigWithDeprecated } from './common/get_xpack_config_with_deprecated';
import { telemetryPlugin, getTelemetryOptIn } from './server';

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
        optIn: Joi.when('allowChangingOptInStatus', {
          is: false,
          then: Joi.valid(true),
          otherwise: Joi.boolean()
            .allow(null)
            .default(null),
        }),
        allowChangingOptInStatus: Joi.boolean().default(true),
        // `config` is used internally and not intended to be set
        config: Joi.string().default(Joi.ref('$defaultConfigPath')),
        banner: Joi.boolean().default(true),
        lastVersionChecked: Joi.string()
          .allow('')
          .default(''),
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
          name: i18n.translate('telemetry.telemetryConfigTitle', {
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
      async replaceInjectedVars(originalInjectedVars: any, request: any) {
        const config = request.server.config();
        const optIn = config.get('telemetry.optIn');
        const allowChangingOptInStatus = config.get('telemetry.allowChangingOptInStatus');
        const currentKibanaVersion = getCurrentKibanaVersion(request.server);
        let telemetryOptedIn: boolean | null;

        if (typeof optIn === 'boolean' && !allowChangingOptInStatus) {
          // When not allowed to change optIn status and an optIn value is set, we'll overwrite with that
          telemetryOptedIn = optIn;
        } else {
          telemetryOptedIn = await getTelemetryOptIn({
            request,
            currentKibanaVersion,
          });
          if (telemetryOptedIn === null) {
            // In the senario there's no value set in telemetryOptedIn, we'll return optIn value
            telemetryOptedIn = optIn;
          }
        }

        return {
          ...originalInjectedVars,
          telemetryOptedIn,
        };
      },
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          telemetryEnabled: getXpackConfigWithDeprecated(config, 'telemetry.enabled'),
          telemetryUrl: getXpackConfigWithDeprecated(config, 'telemetry.url'),
          telemetryBanner:
            config.get('telemetry.allowChangingOptInStatus') !== false &&
            getXpackConfigWithDeprecated(config, 'telemetry.banner'),
          telemetryOptedIn: config.get('telemetry.optIn'),
          allowChangingOptInStatus: config.get('telemetry.allowChangingOptInStatus'),
        };
      },
      hacks: ['plugins/telemetry/hacks/telemetry_init', 'plugins/telemetry/hacks/telemetry_opt_in'],
      mappings,
    },
    async init(server: Server) {
      const initializerContext = {
        env: {
          packageInfo: {
            version: getCurrentKibanaVersion(server),
          },
        },
        config: {
          create() {
            const config = server.config();
            return Rx.of({
              enabled: config.get('telemetry.enabled'),
              optIn: config.get('telemetry.optIn'),
              config: config.get('telemetry.config'),
              banner: config.get('telemetry.banner'),
              url: config.get('telemetry.url'),
              allowChangingOptInStatus: config.get('telemetry.allowChangingOptInStatus'),
            });
          },
        },
      } as PluginInitializerContext;

      const coreSetup = ({
        http: { server },
        log: server.log,
      } as any) as CoreSetup;

      await telemetryPlugin(initializerContext).setup(coreSetup);

      // register collectors
      server.usage.collectorSet.register(createLocalizationUsageCollector(server));
      server.usage.collectorSet.register(createTelemetryUsageCollector(server));
      server.usage.collectorSet.register(createUiMetricUsageCollector(server));
    },
  });
};

// eslint-disable-next-line import/no-default-export
export default telemetry;

function getCurrentKibanaVersion(server: Server): string {
  return server.config().get('pkg.version');
}
