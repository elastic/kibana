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

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { PluginSetupContract as AlertingSetup } from '../../../x-pack/plugins/alerts/public';
import { ChartsPluginStart } from '../../../src/plugins/charts/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../x-pack/plugins/triggers_actions_ui/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { getAlertType as getAlwaysFiringAlertType } from './alert_types/always_firing';
import { getAlertType as getPeopleInSpaceAlertType } from './alert_types/astros';
import { registerNavigation } from './alert_types';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerts: AlertingSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface AlertingExamplePublicStartDeps {
  alerts: AlertingSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
}

export class AlertingExamplePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(
    core: CoreSetup<AlertingExamplePublicStartDeps, Start>,
    { alerts, triggers_actions_ui, developerExamples }: AlertingExamplePublicSetupDeps
  ) {
    core.application.register({
      id: 'AlertingExample',
      title: 'Alerting Example',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });

    triggers_actions_ui.alertTypeRegistry.register(getAlwaysFiringAlertType());
    triggers_actions_ui.alertTypeRegistry.register(getPeopleInSpaceAlertType());

    registerNavigation(alerts);

    developerExamples.register({
      appId: 'AlertingExample',
      title: 'Alerting',
      description: `This alerting example walks you through how to set up a new alert.`,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/alerting',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}
  public stop() {}
}
