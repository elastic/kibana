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

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';
import { SanitizedAlert } from '../../../x-pack/plugins/alerting/common';
import {
  PluginSetupContract as AlertingSetup,
  AlertType,
} from '../../../x-pack/plugins/alerting/server';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerting: AlertingSetup;
}

export class AlertingExamplePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerting }: AlertingExampleDeps) {
    // Create Alert type
    const alwaysFiringAlertType: any = {
      id: '.alerting-example',
      name: 'Alerting Example',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'other', name: 'Other' },
      ],
      async executor(alertExecutorOptions: any) {
        const { services, state, params } = alertExecutorOptions;

        (params.instances || []).forEach((instance: { id: string; state: any }) => {
          services
            .alertInstanceFactory(instance.id)
            .replaceState({ instanceStateValue: true, ...(instance.state || {}) })
            .scheduleActions('default');
        });

        return {
          globalStateValue: true,
          groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
        };
      },
    };
    alerting.registerType(alwaysFiringAlertType);

    alerting.registerNavigation(
      ALERTING_EXAMPLE_APP_ID,
      '.alerting-example',
      (alert: SanitizedAlert, alertType: AlertType) => ({
        state: {
          // LOLs
          alert: JSON.parse(JSON.stringify(alert)),
          alertType: JSON.parse(JSON.stringify(alertType)),
        },
      })
    );
  }

  public start() {}
  public stop() {}
}
