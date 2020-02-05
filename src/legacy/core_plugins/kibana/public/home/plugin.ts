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

import { CoreSetup, CoreStart, LegacyNavLink, Plugin, UiSettingsState } from 'kibana/public';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { setServices } from './kibana_services';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { UsageCollectionSetup } from '../../../../../plugins/usage_collection/public';
import {
  Environment,
  FeatureCatalogueEntry,
  HomePublicPluginStart,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';

export interface LegacyAngularInjectedDependencies {
  telemetryOptInProvider: any;
  shouldShowTelemetryOptIn: boolean;
}

export interface HomePluginStartDependencies {
  data: DataPublicPluginStart;
  home: HomePublicPluginStart;
}

export interface HomePluginSetupDependencies {
  __LEGACY: {
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
  usageCollection: UsageCollectionSetup;
  kibana_legacy: KibanaLegacySetup;
  home: HomePublicPluginSetup;
}

export class HomePlugin implements Plugin {
  private dataStart: DataPublicPluginStart | null = null;
  private savedObjectsClient: any = null;
  private environment: Environment | null = null;

  setup(
    core: CoreSetup,
    {
      home,
      kibana_legacy,
      usageCollection,
      __LEGACY: { getAngularDependencies, ...legacyServices },
    }: HomePluginSetupDependencies
  ) {
    kibana_legacy.registerLegacyApp({
      id: 'home',
      title: 'Home',
      mount: async ({ core: contextCore }, params) => {
        const trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, 'Kibana_home');
        const angularDependencies = await getAngularDependencies();
        setServices({
          ...legacyServices,
          trackUiMetric,
          http: contextCore.http,
          toastNotifications: core.notifications.toasts,
          banners: contextCore.overlays.banners,
          getInjected: core.injectedMetadata.getInjectedVar,
          docLinks: contextCore.docLinks,
          savedObjectsClient: this.savedObjectsClient!,
          chrome: contextCore.chrome,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          indexPatternService: this.dataStart!.indexPatterns,
          environment: this.environment!,
          config: kibana_legacy.config,
          homeConfig: home.config,
          ...angularDependencies,
        });
        const { renderApp } = await import('./np_ready/application');
        return await renderApp(params.element);
      },
    });
  }

  start(core: CoreStart, { data, home }: HomePluginStartDependencies) {
    this.environment = home.environment.get();
    this.dataStart = data;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
