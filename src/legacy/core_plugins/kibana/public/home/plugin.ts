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
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { TelemetryPluginStart } from 'src/plugins/telemetry/public';
import { setServices } from './kibana_services';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { UsageCollectionSetup } from '../../../../../plugins/usage_collection/public';
import {
  Environment,
  HomePublicPluginStart,
  HomePublicPluginSetup,
  FeatureCatalogueEntry,
} from '../../../../../plugins/home/public';

export interface HomePluginStartDependencies {
  data: DataPublicPluginStart;
  home: HomePublicPluginStart;
  telemetry?: TelemetryPluginStart;
}

export interface HomePluginSetupDependencies {
  usageCollection: UsageCollectionSetup;
  kibanaLegacy: KibanaLegacySetup;
  home: HomePublicPluginSetup;
}

export class HomePlugin implements Plugin {
  private dataStart: DataPublicPluginStart | null = null;
  private savedObjectsClient: any = null;
  private environment: Environment | null = null;
  private directories: readonly FeatureCatalogueEntry[] | null = null;
  private telemetry?: TelemetryPluginStart;

  constructor(private initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup, { home, kibanaLegacy, usageCollection }: HomePluginSetupDependencies) {
    kibanaLegacy.registerLegacyApp({
      id: 'home',
      title: 'Home',
      mount: async (params: AppMountParameters) => {
        const trackUiMetric = usageCollection.reportUiStats.bind(usageCollection, 'Kibana_home');
        const [coreStart] = await core.getStartServices();
        setServices({
          trackUiMetric,
          kibanaVersion: this.initializerContext.env.packageInfo.version,
          http: coreStart.http,
          toastNotifications: core.notifications.toasts,
          banners: coreStart.overlays.banners,
          getInjected: core.injectedMetadata.getInjectedVar,
          docLinks: coreStart.docLinks,
          savedObjectsClient: this.savedObjectsClient!,
          chrome: coreStart.chrome,
          telemetry: this.telemetry,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          indexPatternService: this.dataStart!.indexPatterns,
          environment: this.environment!,
          config: kibanaLegacy.config,
          homeConfig: home.config,
          directories: this.directories!,
        });
        const { renderApp } = await import('./np_ready/application');
        return await renderApp(params.element);
      },
    });
  }

  start(core: CoreStart, { data, home, telemetry }: HomePluginStartDependencies) {
    this.environment = home.environment.get();
    this.directories = home.featureCatalogue.get();
    this.dataStart = data;
    this.telemetry = telemetry;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
