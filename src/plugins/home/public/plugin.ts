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

import {
  EnvironmentService,
  EnvironmentServiceSetup,
  FeatureCatalogueRegistry,
  FeatureCatalogueRegistrySetup,
  TutorialService,
  TutorialServiceSetup,
} from './services';
import { ConfigSchema } from '../config';
import { setServices } from './application/kibana_services';
import { DataPublicPluginStart } from '../../data/public';
import { TelemetryPluginStart } from '../../telemetry/public';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { KibanaLegacySetup } from '../../kibana_legacy/public';

export interface HomePluginStartDependencies {
  data: DataPublicPluginStart;
  telemetry?: TelemetryPluginStart;
}

export interface HomePluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
  kibanaLegacy: KibanaLegacySetup;
}

export class HomePublicPlugin implements Plugin<HomePublicPluginSetup, void> {
  private readonly featuresCatalogueRegistry = new FeatureCatalogueRegistry();
  private readonly environmentService = new EnvironmentService();
  private readonly tutorialService = new TutorialService();

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup<HomePluginStartDependencies>,
    { kibanaLegacy, usageCollection }: HomePluginSetupDependencies
  ): HomePublicPluginSetup {
    kibanaLegacy.registerLegacyApp({
      id: 'home',
      title: 'Home',
      mount: async (params: AppMountParameters) => {
        const trackUiMetric = usageCollection
          ? usageCollection.reportUiStats.bind(usageCollection, 'Kibana_home')
          : () => {};
        const [coreStart, { telemetry, data }] = await core.getStartServices();
        setServices({
          trackUiMetric,
          kibanaVersion: this.initializerContext.env.packageInfo.version,
          http: coreStart.http,
          toastNotifications: core.notifications.toasts,
          banners: coreStart.overlays.banners,
          docLinks: coreStart.docLinks,
          savedObjectsClient: coreStart.savedObjects.client,
          chrome: coreStart.chrome,
          telemetry,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          indexPatternService: data.indexPatterns,
          environmentService: this.environmentService,
          config: kibanaLegacy.config,
          homeConfig: this.initializerContext.config.get(),
          tutorialService: this.tutorialService,
          featureCatalogue: this.featuresCatalogueRegistry,
        });
        const { renderApp } = await import('./application');
        return await renderApp(params.element);
      },
    });
    return {
      featureCatalogue: { ...this.featuresCatalogueRegistry.setup() },
      environment: { ...this.environmentService.setup() },
      tutorials: { ...this.tutorialService.setup() },
    };
  }

  public start({ application: { capabilities } }: CoreStart) {
    this.featuresCatalogueRegistry.start({ capabilities });
  }
}

/** @public */
export type FeatureCatalogueSetup = FeatureCatalogueRegistrySetup;

/** @public */
export type EnvironmentSetup = EnvironmentServiceSetup;

/** @public */
export type TutorialSetup = TutorialServiceSetup;

/** @public */
export interface HomePublicPluginSetup {
  tutorials: TutorialServiceSetup;
  featureCatalogue: FeatureCatalogueSetup;
  /**
   * The environment service is only available for a transition period and will
   * be replaced by display specific extension points.
   * @deprecated
   */
  environment: EnvironmentSetup;
}
