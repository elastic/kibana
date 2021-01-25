/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';

import {
  EnvironmentService,
  EnvironmentServiceSetup,
  FeatureCatalogueCategory,
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
import { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import { AppNavLinkStatus } from '../../../core/public';
import { PLUGIN_ID, HOME_APP_BASE_PATH } from '../common/constants';

export interface HomePluginStartDependencies {
  data: DataPublicPluginStart;
  telemetry?: TelemetryPluginStart;
  urlForwarding: UrlForwardingStart;
}

export interface HomePluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
  urlForwarding: UrlForwardingSetup;
}

export class HomePublicPlugin
  implements
    Plugin<
      HomePublicPluginSetup,
      HomePublicPluginStart,
      HomePluginSetupDependencies,
      HomePluginStartDependencies
    > {
  private readonly featuresCatalogueRegistry = new FeatureCatalogueRegistry();
  private readonly environmentService = new EnvironmentService();
  private readonly tutorialService = new TutorialService();

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup<HomePluginStartDependencies>,
    { urlForwarding, usageCollection }: HomePluginSetupDependencies
  ): HomePublicPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Home',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const trackUiMetric = usageCollection
          ? usageCollection.reportUiCounter.bind(usageCollection, 'Kibana_home')
          : () => {};
        const [
          coreStart,
          { telemetry, data, urlForwarding: urlForwardingStart },
        ] = await core.getStartServices();
        setServices({
          trackUiMetric,
          kibanaVersion: this.initializerContext.env.packageInfo.version,
          http: coreStart.http,
          toastNotifications: core.notifications.toasts,
          banners: coreStart.overlays.banners,
          docLinks: coreStart.docLinks,
          savedObjectsClient: coreStart.savedObjects.client,
          chrome: coreStart.chrome,
          application: coreStart.application,
          telemetry,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          indexPatternService: data.indexPatterns,
          environmentService: this.environmentService,
          urlForwarding: urlForwardingStart,
          homeConfig: this.initializerContext.config.get(),
          tutorialService: this.tutorialService,
          featureCatalogue: this.featuresCatalogueRegistry,
        });
        coreStart.chrome.docTitle.change(
          i18n.translate('home.pageTitle', { defaultMessage: 'Home' })
        );
        const { renderApp } = await import('./application');
        return await renderApp(params.element, coreStart, params.history);
      },
    });
    urlForwarding.forwardApp('home', 'home');

    const featureCatalogue = { ...this.featuresCatalogueRegistry.setup() };

    featureCatalogue.register({
      id: 'home_tutorial_directory',
      title: i18n.translate('home.tutorialDirectory.featureCatalogueTitle', {
        defaultMessage: 'Add data',
      }),
      description: i18n.translate('home.tutorialDirectory.featureCatalogueDescription', {
        defaultMessage: 'Ingest data from popular apps and services.',
      }),
      icon: 'indexOpen',
      showOnHomePage: true,
      path: `${HOME_APP_BASE_PATH}#/tutorial_directory`,
      category: 'data' as FeatureCatalogueCategory.DATA,
      order: 500,
    });

    return {
      featureCatalogue,
      environment: { ...this.environmentService.setup() },
      tutorials: { ...this.tutorialService.setup() },
    };
  }

  public start(
    { application: { capabilities, currentAppId$ }, http }: CoreStart,
    { urlForwarding }: HomePluginStartDependencies
  ) {
    this.featuresCatalogueRegistry.start({ capabilities });

    // If the home app is the initial location when loading Kibana...
    if (
      window.location.pathname === http.basePath.prepend(HOME_APP_BASE_PATH) &&
      window.location.hash === ''
    ) {
      // ...wait for the app to mount initially and then...
      currentAppId$.pipe(first()).subscribe((appId) => {
        if (appId === 'home') {
          // ...navigate to default app set by `kibana.defaultAppId`.
          // This doesn't do anything as along as the default settings are kept.
          urlForwarding.navigateToDefaultApp({ overwriteHash: false });
        }
      });
    }

    return { featureCatalogue: this.featuresCatalogueRegistry };
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
export interface HomePublicPluginStart {
  featureCatalogue: FeatureCatalogueRegistry;
}
