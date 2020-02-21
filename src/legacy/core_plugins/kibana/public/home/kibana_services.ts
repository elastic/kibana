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

import {
  ChromeStart,
  DocLinksStart,
  HttpStart,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
} from 'kibana/public';
import { UiStatsMetricType } from '@kbn/analytics';
import { TelemetryPluginStart } from '../../../../../plugins/telemetry/public';
import {
  Environment,
  HomePublicPluginSetup,
  TutorialStart,
  HomePublicPluginStart,
} from '../../../../../plugins/home/public';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';

export interface HomeKibanaServices {
  indexPatternService: any;
  kibanaVersion: string;
  chrome: ChromeStart;
  uiSettings: IUiSettingsClient;
  config: KibanaLegacySetup['config'];
  homeConfig: HomePublicPluginSetup['config'];
  featureCatalogue: HomePublicPluginStart['featureCatalogue'];
  http: HttpStart;
  savedObjectsClient: SavedObjectsClientContract;
  toastNotifications: NotificationsSetup['toasts'];
  banners: OverlayStart['banners'];
  trackUiMetric: (type: UiStatsMetricType, eventNames: string | string[], count?: number) => void;
  getBasePath: () => string;
  docLinks: DocLinksStart;
  addBasePath: (url: string) => string;
  environment: Environment;
  telemetry?: TelemetryPluginStart;
  tutorialVariables: TutorialStart['get'];
}

let services: HomeKibanaServices | null = null;

export function setServices(newServices: HomeKibanaServices) {
  services = newServices;
}

export function getServices() {
  if (!services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the home app?'
    );
  }
  return services;
}
