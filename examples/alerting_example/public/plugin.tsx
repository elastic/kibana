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

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { PluginSetupContract as AlertingSetup } from '../../../x-pack/plugins/alerting/public';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';
import { AlertType, SanitizedAlert } from '../../../x-pack/plugins/alerting/common';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerting: AlertingSetup;
}

export class AlertingExamplePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { alerting }: AlertingExamplePublicSetupDeps) {
    core.application.register({
      id: 'AlertingExample',
      title: 'Alerting Example',
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });

    alerting.registerNavigation(
      ALERTING_EXAMPLE_APP_ID,
      '.alerting-example',
      (alert: SanitizedAlert, alertType: AlertType) => `/alert/${alert.id}`
    );
  }

  public start() {}
  public stop() {}
}
