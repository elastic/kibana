/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { AppNavLinkStatus } from '@kbn/core/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { PLUGIN_ID, HOME_APP_BASE_PATH } from '../common/constants';
import { setServices } from './application/kibana_services';
import { ConfigSchema } from '../config';
import {
  EnvironmentService,
  EnvironmentServiceSetup,
  FeatureCatalogueRegistry,
  FeatureCatalogueRegistrySetup,
  TutorialService,
  TutorialServiceSetup,
  AddDataService,
  AddDataServiceSetup,
  WelcomeService,
  WelcomeServiceSetup,
} from './services';

export interface HomePluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  urlForwarding: UrlForwardingStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export interface HomePluginSetupDependencies {
  cloud?: CloudSetup;
  share: SharePluginSetup;
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
    >
{
  private readonly featuresCatalogueRegistry = new FeatureCatalogueRegistry();
  private readonly environmentService = new EnvironmentService();
  private readonly tutorialService = new TutorialService();
  private readonly addDataService = new AddDataService();
  private readonly welcomeService = new WelcomeService();

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup<HomePluginStartDependencies>,
    { cloud, share, urlForwarding, usageCollection }: HomePluginSetupDependencies
  ): HomePublicPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Home',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        const trackUiMetric = usageCollection
          ? usageCollection.reportUiCounter.bind(usageCollection, 'Kibana_home')
          : () => {};
        const [coreStart, { dataViews, urlForwarding: urlForwardingStart, guidedOnboarding }] =
          await core.getStartServices();
        setServices({
          share,
          trackUiMetric,
          kibanaVersion: this.initializerContext.env.packageInfo.version,
          http: coreStart.http,
          toastNotifications: coreStart.notifications.toasts,
          banners: coreStart.overlays.banners,
          docLinks: coreStart.docLinks,
          savedObjectsClient: coreStart.savedObjects.client,
          chrome: coreStart.chrome,
          application: coreStart.application,
          uiSettings: core.uiSettings,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          dataViewsService: dataViews,
          environmentService: this.environmentService,
          urlForwarding: urlForwardingStart,
          homeConfig: this.initializerContext.config.get(),
          tutorialService: this.tutorialService,
          addDataService: this.addDataService,
          featureCatalogue: this.featuresCatalogueRegistry,
          welcomeService: this.welcomeService,
          guidedOnboardingService: guidedOnboarding.guidedOnboardingApi,
          cloud,
        });
        coreStart.chrome.docTitle.change(
          i18n.translate('home.pageTitle', { defaultMessage: 'Home' })
        );
        const { renderApp } = await import('./application');
        return await renderApp(params.element, params.theme$, coreStart, params.history);
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
      category: 'data',
      order: 500,
    });

    const environment = { ...this.environmentService.setup() };
    const tutorials = { ...this.tutorialService.setup() };
    if (cloud) {
      environment.update({ cloud: cloud.isCloudEnabled });
      if (cloud.isCloudEnabled) {
        tutorials.setVariable('cloud', {
          id: cloud.cloudId,
          baseUrl: cloud.baseUrl,
          // Cloud's API already provides the full URLs
          profileUrl: cloud.profileUrl?.replace(cloud.baseUrl ?? '', ''),
          deploymentUrl: cloud.deploymentUrl?.replace(cloud.baseUrl ?? '', ''),
        });
      }
    }

    return {
      featureCatalogue,
      environment,
      tutorials,
      addData: { ...this.addDataService.setup() },
      welcomeScreen: { ...this.welcomeService.setup() },
    };
  }

  public start({ application: { capabilities } }: CoreStart) {
    this.featuresCatalogueRegistry.start({ capabilities });

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
export type AddDataSetup = AddDataServiceSetup;

/** @public */
export interface HomePublicPluginSetup {
  tutorials: TutorialServiceSetup;
  addData: AddDataServiceSetup;
  featureCatalogue: FeatureCatalogueSetup;
  welcomeScreen: WelcomeServiceSetup;
  /**
   * The environment service is only available for a transition period and will
   * be replaced by display specific extension points.
   * @deprecated
   * @removeBy 8.8.0
   */
  environment: EnvironmentSetup;
}

export interface HomePublicPluginStart {
  featureCatalogue: FeatureCatalogueRegistry;
}
