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
  CoreSetup,
  CoreStart,
  LegacyCoreSetup,
  LegacyNavLink,
  Plugin,
  UiSettingsState,
} from 'kibana/public';
import { UiStatsMetricType } from '@kbn/analytics';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { setServices } from './kibana_services';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { FeatureCatalogueEntry } from '../../../../../plugins/home/public';

export interface LegacyAngularInjectedDependencies {
  telemetryOptInProvider: any;
  shouldShowTelemetryOptIn: boolean;
}

export interface HomePluginStartDependencies {
  data: DataPublicPluginStart;
}

export interface HomePluginSetupDependencies {
  __LEGACY: {
    trackUiMetric: (type: UiStatsMetricType, eventNames: string | string[], count?: number) => void;
    METRIC_TYPE: any;
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
    getFeatureCatalogueEntries: () => Promise<readonly FeatureCatalogueEntry[]>;
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
  };
  kibana_legacy: KibanaLegacySetup;
}

export class HomePlugin implements Plugin {
  private dataStart: DataPublicPluginStart | null = null;
  private savedObjectsClient: any = null;

  setup(
    core: CoreSetup,
    {
      kibana_legacy,
      __LEGACY: { getAngularDependencies, ...legacyServices },
    }: HomePluginSetupDependencies
  ) {
    kibana_legacy.registerLegacyApp({
      id: 'home',
      title: 'Home',
      mount: async ({ core: contextCore }, params) => {
        const angularDependencies = await getAngularDependencies();
        setServices({
          ...legacyServices,
          http: contextCore.http,
          toastNotifications: core.notifications.toasts,
          banners: contextCore.overlays.banners,
          getInjected: (core as LegacyCoreSetup).injectedMetadata.getInjectedVar,
          docLinks: contextCore.docLinks,
          savedObjectsClient: this.savedObjectsClient!,
          chrome: contextCore.chrome,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          indexPatternService: this.dataStart!.indexPatterns,
          ...angularDependencies,
        });
        const { renderApp } = await import('./np_ready/application');
        return await renderApp(params.element);
      },
    });
  }

  start(core: CoreStart, { data }: HomePluginStartDependencies) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
