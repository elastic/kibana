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

import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { getAlertType as AlwaysFire } from './components/always_fire_alert_type';
import { getAlertType as NoExpression } from './components/no_expression_alert_type';
import { getAlertType as WeatherAlert } from './components/weather_alert_type';
import { getAlertType as StockAlert } from './components/stock_alert_type';
import { getAlertType as FiresOnce } from './components/fires_once_alert_type';
import {
  AlertExamplePluginSetup,
  AlertExamplePluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class AlertExamplePlugin
  implements Plugin<AlertExamplePluginSetup, AlertExamplePluginStart> {
  public setup(core: CoreSetup, deps: AppPluginStartDependencies): AlertExamplePluginSetup {
    // Register an application into the side navigation menus
    core.application.register({
      id: 'alertExample',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();

        const { triggers_actions_ui } = deps;

        triggers_actions_ui.alertTypeRegistry.register(AlwaysFire());
        triggers_actions_ui.alertTypeRegistry.register(NoExpression());
        triggers_actions_ui.alertTypeRegistry.register(WeatherAlert());
        triggers_actions_ui.alertTypeRegistry.register(StockAlert());
        triggers_actions_ui.alertTypeRegistry.register(FiresOnce());

        // Render the application
        return renderApp(
          coreStart,
          {
            ...(depsStart as AppPluginStartDependencies),
            ...{ triggers_actions_ui },
          },
          params
        );
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('alertExample.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): AlertExamplePluginStart {
    return {};
  }

  public stop() {}
}
