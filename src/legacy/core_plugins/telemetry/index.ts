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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getConfigPath } from '../../../core/server/path';
// @ts-ignore
import mappings from './mappings.json';
import { CONFIG_TELEMETRY, getConfigTelemetryDesc } from './common/constants';
import { getXpackConfigWithDeprecated } from './common/get_xpack_config_with_deprecated';
import { telemetryPlugin, replaceTelemetryInjectedVars, FetcherTask, PluginsSetup } from './server';

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
        allowChangingOptInStatus: Joi.boolean().default(true),
        optIn: Joi.when('allowChangingOptInStatus', {
          is: false,
          then: Joi.valid(true).default(true),
          otherwise: Joi.boolean().default(true),
        }),
        // `config` is used internally and not intended to be set
        config: Joi.string().default(getConfigPath()),
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
        optInStatusUrl: Joi.when('$dev', {
          is: true,
          then: Joi.string().default(
            `https://telemetry-staging.elastic.co/opt_in_status/${ENDPOINT_VERSION}/send`
          ),
          otherwise: Joi.string().default(
            `https://telemetry.elastic.co/opt_in_status/${ENDPOINT_VERSION}/send`
          ),
        }),
        sendUsageFrom: Joi.string()
          .allow(['server', 'browser'])
          .default('browser'),
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
      async replaceInjectedVars(originalInjectedVars: any, request: any, server: any) {
        const telemetryInjectedVars = await replaceTelemetryInjectedVars(request, server);
        return Object.assign({}, originalInjectedVars, telemetryInjectedVars);
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
          telemetryOptInStatusUrl: config.get('telemetry.optInStatusUrl'),
          allowChangingOptInStatus: config.get('telemetry.allowChangingOptInStatus'),
          telemetrySendUsageFrom: config.get('telemetry.sendUsageFrom'),
          telemetryNotifyUserAboutOptInDefault: false,
        };
      },
      hacks: ['plugins/telemetry/hacks/telemetry_init', 'plugins/telemetry/hacks/telemetry_opt_in'],
      mappings,
    },
    postInit(server: Server) {
      const fetcherTask = new FetcherTask(server);
      fetcherTask.start();
    },
    init(server: Server) {
      const { usageCollection } = server.newPlatform.setup.plugins;
      const initializerContext = {
        env: {
          packageInfo: {
            version: server.config().get('pkg.version'),
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

      const pluginsSetup: PluginsSetup = {
        usageCollection,
      };

      telemetryPlugin(initializerContext).setup(coreSetup, pluginsSetup, server);
    },
  });
};

// eslint-disable-next-line import/no-default-export
export default telemetry;
