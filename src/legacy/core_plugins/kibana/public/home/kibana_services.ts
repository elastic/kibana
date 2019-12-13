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
  LegacyNavLink,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
  UiSettingsState,
} from 'kibana/public';
import { UiStatsMetricType } from '@kbn/analytics';
import { FeatureCatalogueEntry } from '../../../../../plugins/home/public';

export interface HomeKibanaServices {
  indexPatternService: any;
  getFeatureCatalogueEntries: () => Promise<readonly FeatureCatalogueEntry[]>;
  metadata: {
    app: unknown;
    bundleId: string;
    nav: LegacyNavLink[];
    version: string;
    branch: string;
    buildNum: number;
    buildSha: string;
    basePath: string;
    serverName: string;
    devMode: boolean;
    uiSettings: { defaults: UiSettingsState; user?: UiSettingsState | undefined };
  };
  getInjected: (name: string, defaultValue?: any) => unknown;
  chrome: ChromeStart;
  telemetryOptInProvider: any;
  uiSettings: IUiSettingsClient;
  http: HttpStart;
  savedObjectsClient: SavedObjectsClientContract;
  toastNotifications: NotificationsSetup['toasts'];
  banners: OverlayStart['banners'];
  METRIC_TYPE: any;
  trackUiMetric: (type: UiStatsMetricType, eventNames: string | string[], count?: number) => void;
  getBasePath: () => string;
  shouldShowTelemetryOptIn: boolean;
  docLinks: DocLinksStart;
  addBasePath: (url: string) => string;
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
