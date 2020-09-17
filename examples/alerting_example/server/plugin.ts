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

import { Plugin, CoreSetup } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { PluginSetupContract as AlertingSetup } from '../../../x-pack/plugins/alerts/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../x-pack/plugins/features/server';

import { alertType as alwaysFiringAlert } from './alert_types/always_firing';
import { alertType as peopleInSpaceAlert } from './alert_types/astros';
import { INDEX_THRESHOLD_ID } from '../../../x-pack/plugins/alerting_builtins/server';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

// this plugin's dependendencies
export interface AlertingExampleDeps {
  alerts: AlertingSetup;
  features: FeaturesPluginSetup;
}

export class AlertingExamplePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerts, features }: AlertingExampleDeps) {
    alerts.registerType(alwaysFiringAlert);
    alerts.registerType(peopleInSpaceAlert);

    features.registerKibanaFeature({
      id: ALERTING_EXAMPLE_APP_ID,
      name: i18n.translate('alertsExample.featureRegistry.alertsExampleFeatureName', {
        defaultMessage: 'Alerts Example',
      }),
      app: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
      privileges: {
        all: {
          alerting: {
            all: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
        read: {
          alerting: {
            read: [alwaysFiringAlert.id, peopleInSpaceAlert.id, INDEX_THRESHOLD_ID],
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
      },
    });
  }

  public start() {}
  public stop() {}
}
