/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { i18n } from '@kbn/i18n';
import { once } from 'lodash';
import { DISCOVER_ESQL_LOCATOR } from '@kbn/deeplinks-analytics';
import { DISCOVER_APP_LOCATOR, PLUGIN_ID, type DiscoverAppLocator } from '../common';
import {
  DISCOVER_CONTEXT_APP_LOCATOR,
  type DiscoverContextAppLocator,
} from './application/context/services/locator';
import {
  DISCOVER_SINGLE_DOC_LOCATOR,
  type DiscoverSingleDocLocator,
} from './application/doc/locator';
import { registerFeature } from './plugin_imports/register_feature';
import type { UrlTracker } from './build_services';
import { initializeKbnUrlTracking } from './utils/initialize_kbn_url_tracking';
import { defaultCustomizationContext } from './customizations/defaults';
import {
  SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER,
  ACTION_VIEW_SAVED_SEARCH,
} from './embeddable/constants';
import {
  DiscoverContainerInternal,
  type DiscoverContainerProps,
} from './components/discover_container';
import { getESQLSearchProvider } from './plugin_imports/search_provider';
import type { ConfigSchema, ExperimentalFeatures } from '../server/config';
import type {
  DiscoverSetup,
  DiscoverSetupPlugins,
  DiscoverStart,
  DiscoverStartPlugins,
} from './types';
import { DISCOVER_CELL_ACTIONS_TRIGGER } from './context_awareness/types';
import type {
  DiscoverEBTContextProps,
  DiscoverEBTManager,
} from './plugin_imports/discover_ebt_manager';
import type { ProfilesManager } from './context_awareness';
import { forwardLegacyUrls } from './plugin_imports/forward_legacy_urls';
import { registerDiscoverEBTManagerAnalytics } from './plugin_imports/discover_ebt_manager_registrations';

/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins>
{
  private readonly discoverEbtContext$ = new BehaviorSubject<DiscoverEBTContextProps>({
    discoverProfiles: [],
  });
  private readonly appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly experimentalFeatures: ExperimentalFeatures;

  private scopedHistory?: ScopedHistory<unknown>;
  private urlTracker?: UrlTracker;
  private stopUrlTracking?: () => void;
  private locator?: DiscoverAppLocator;
  private contextLocator?: DiscoverContextAppLocator;
  private singleDocLocator?: DiscoverSingleDocLocator;

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {
    const experimental = this.initializerContext.config.get().experimental;

    this.experimentalFeatures = {
      ruleFormV2Enabled: experimental?.ruleFormV2Enabled ?? false,
      enabledProfiles: experimental?.enabledProfiles ?? [],
    };
  }

  setup(
    core: CoreSetup<DiscoverStartPlugins, DiscoverStart>,
    plugins: DiscoverSetupPlugins
  ): DiscoverSetup {
    const baseUrl = core.http.basePath.prepend('/app/discover');

    if (plugins.share) {
      const useHash = core.uiSettings.get('state:storeInSessionStorage');

      this.locator = plugins.share.url.locators.create({
        id: DISCOVER_APP_LOCATOR,
        getLocation: async (params) => {
          const { appLocatorGetLocation } = await getLocators();
          return appLocatorGetLocation({ useHash }, params);
        },
      });

      this.contextLocator = plugins.share.url.locators.create({
        id: DISCOVER_CONTEXT_APP_LOCATOR,
        getLocation: async (params) => {
          const { contextAppLocatorGetLocation } = await getLocators();
          return contextAppLocatorGetLocation({ useHash }, params);
        },
      });

      this.singleDocLocator = plugins.share.url.locators.create({
        id: DISCOVER_SINGLE_DOC_LOCATOR,
        getLocation: async (params) => {
          const { singleDocLocatorGetLocation } = await getLocators();
          return singleDocLocatorGetLocation(params);
        },
      });
    }

    if (plugins.globalSearch) {
      plugins.globalSearch.registerResultProvider(
        getESQLSearchProvider({
          isESQLEnabled: core.uiSettings.get(ENABLE_ESQL),
          locator: this.locator,
          getServices: async () => {
            const [coreStart, startPlugins] = await core.getStartServices();
            return [coreStart, startPlugins];
          },
        })
      );
    }

    const {
      setTrackedUrl,
      restorePreviousUrl,
      stopUrlTracker,
      appMounted,
      appUnMounted,
      setTrackingEnabled,
    } = initializeKbnUrlTracking({
      baseUrl,
      core,
      navLinkUpdater$: this.appStateUpdater,
      plugins,
      getScopedHistory: () => this.scopedHistory!,
    });

    this.urlTracker = { setTrackedUrl, restorePreviousUrl, setTrackingEnabled };
    this.stopUrlTracking = stopUrlTracker;

    const getEbtManager = once(async () => {
      const { DiscoverEBTManager } = await getSharedServices();
      const ebtManager = new DiscoverEBTManager();
      ebtManager.initialize({ core, discoverEbtContext$: this.discoverEbtContext$ });
      return ebtManager;
    });

    registerDiscoverEBTManagerAnalytics(core, this.discoverEbtContext$);

    core.application.register({
      id: PLUGIN_ID,
      title: 'Discover',
      updater$: this.appStateUpdater,
      order: 1000,
      euiIconType: 'logoKibana',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      visibleIn: ['globalSearch', 'sideNav', 'kibanaOverview'],
      mount: async (params: AppMountParameters) => {
        const [coreStart, discoverStartPlugins] = await core.getStartServices();

        // Store the current scoped history so initializeKbnUrlTracking can access it
        this.scopedHistory = params.history;

        (await getHistoryService()).syncHistoryLocations();
        appMounted();

        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = this.scopedHistory.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        const ebtManager = await getEbtManager();
        ebtManager.onDiscoverAppMounted();

        const services = await this.getDiscoverServicesWithProfiles({
          core: coreStart,
          plugins: discoverStartPlugins,
          ebtManager,
          scopedHistory: this.scopedHistory,
          setHeaderActionMenu: params.setHeaderActionMenu,
        });

        // make sure the data view list is up to date
        discoverStartPlugins.dataViews.clearCache();

        // FIXME: Temporarily hide overflow-y in Discover app when Field Stats table is shown
        // due to EUI bug https://github.com/elastic/eui/pull/5152
        params.element.classList.add('dscAppWrapper');

        const { renderApp } = await import('./application');
        const unmount = renderApp({
          element: params.element,
          services,
          customizationContext: defaultCustomizationContext,
          experimentalFeatures: this.experimentalFeatures,
        });

        return () => {
          ebtManager.onDiscoverAppUnmounted();
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    if (plugins.home) {
      registerFeature(plugins.home);
    }

    forwardLegacyUrls(plugins.urlForwarding);
    this.registerEmbeddable(core, plugins);

    return { locator: this.locator };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    plugins.uiActions.addTriggerActionAsync(
      'CONTEXT_MENU_TRIGGER',
      ACTION_VIEW_SAVED_SEARCH,
      async () => {
        const { ViewSavedSearchAction } = await getEmbeddableServices();
        return new ViewSavedSearchAction(core.application, this.locator!);
      }
    );
    plugins.uiActions.registerTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER);
    plugins.uiActions.registerTrigger(DISCOVER_CELL_ACTIONS_TRIGGER);

    const isEsqlEnabled = core.uiSettings.get(ENABLE_ESQL);

    if (plugins.share && this.locator && isEsqlEnabled) {
      const discoverAppLocator = this.locator;
      plugins.share?.url.locators.create({
        id: DISCOVER_ESQL_LOCATOR,
        getLocation: async () => {
          const { esqlLocatorGetLocation } = await getLocators();
          return esqlLocatorGetLocation({
            discoverAppLocator,
            dataViews: plugins.dataViews,
          });
        },
      });
    }

    const getDiscoverServicesInternal = async () => {
      const ebtManager = await getEmptyEbtManager();
      const { profilesManager } = await this.createProfileServices(ebtManager);
      return this.getDiscoverServices({ core, plugins, profilesManager, ebtManager });
    };

    return {
      locator: this.locator,
      DiscoverContainer: (props: DiscoverContainerProps) => (
        <DiscoverContainerInternal getDiscoverServices={getDiscoverServicesInternal} {...props} />
      ),
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  private async createProfileServices(ebtManager: DiscoverEBTManager) {
    const {
      RootProfileService,
      DataSourceProfileService,
      DocumentProfileService,
      ProfilesManager,
    } = await getSharedServices();

    const rootProfileService = new RootProfileService();
    const dataSourceProfileService = new DataSourceProfileService();
    const documentProfileService = new DocumentProfileService();
    const profilesManager = new ProfilesManager(
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      ebtManager
    );

    return {
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      profilesManager,
    };
  }

  private async getDiscoverServicesWithProfiles({
    core,
    plugins,
    ebtManager,
    scopedHistory,
    setHeaderActionMenu,
  }: {
    core: CoreStart;
    plugins: DiscoverStartPlugins;
    ebtManager: DiscoverEBTManager;
    scopedHistory?: ScopedHistory;
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  }) {
    const {
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      profilesManager,
    } = await this.createProfileServices(ebtManager);
    const services = await this.getDiscoverServices({
      core,
      plugins,
      profilesManager,
      ebtManager,
      scopedHistory,
      setHeaderActionMenu,
    });
    const { registerProfileProviders } = await import('./context_awareness/profile_providers');

    await registerProfileProviders({
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      enabledExperimentalProfileIds: this.experimentalFeatures.enabledProfiles ?? [],
      services,
    });

    return services;
  }

  private getDiscoverServices = async ({
    core,
    plugins,
    profilesManager,
    ebtManager,
    scopedHistory,
    setHeaderActionMenu,
  }: {
    core: CoreStart;
    plugins: DiscoverStartPlugins;
    profilesManager: ProfilesManager;
    ebtManager: DiscoverEBTManager;
    scopedHistory?: ScopedHistory;
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  }) => {
    const { buildServices } = await getSharedServices();
    return buildServices({
      core,
      plugins,
      context: this.initializerContext,
      locator: this.locator!,
      contextLocator: this.contextLocator!,
      singleDocLocator: this.singleDocLocator!,
      history: (await getHistoryService()).getHistory(),
      scopedHistory,
      urlTracker: this.urlTracker!,
      profilesManager,
      ebtManager,
      setHeaderActionMenu,
    });
  };

  private registerEmbeddable(core: CoreSetup<DiscoverStartPlugins>, plugins: DiscoverSetupPlugins) {
    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        executeTriggerActions: deps.uiActions.executeTriggerActions,
        isEditable: () => coreStart.application.capabilities.discover_v2.save as boolean,
      };
    };

    const getDiscoverServicesForEmbeddable = async () => {
      const [coreStart, deps] = await core.getStartServices();
      const ebtManager = await getEmptyEbtManager();
      return this.getDiscoverServicesWithProfiles({
        core: coreStart,
        plugins: deps,
        ebtManager,
      });
    };

    plugins.embeddable.registerAddFromLibraryType<SavedSearchAttributes>({
      onAdd: async (...params) => {
        const services = await getDiscoverServicesForEmbeddable();
        const { getOnAddSearchEmbeddable } = await getEmbeddableServices();
        return getOnAddSearchEmbeddable(services)(...params);
      },
      savedObjectType: SavedSearchType,
      savedObjectName: i18n.translate('discover.savedSearch.savedObjectName', {
        defaultMessage: 'Discover session',
      }),
      getIconForSavedObject: () => 'discoverApp',
    });

    plugins.embeddable.registerReactEmbeddableFactory(SEARCH_EMBEDDABLE_TYPE, async () => {
      const [startServices, discoverServices, { getSearchEmbeddableFactory }] = await Promise.all([
        getStartServices(),
        getDiscoverServicesForEmbeddable(),
        getEmbeddableServices(),
      ]);

      return getSearchEmbeddableFactory({
        startServices,
        discoverServices,
      });
    });
  }
}

const getLocators = () => import('./plugin_imports/locators');
const getEmbeddableServices = () => import('./plugin_imports/embeddable_services');
const getSharedServices = () => import('./plugin_imports/shared_services');

const getHistoryService = once(async () => {
  const { HistoryService } = await getSharedServices();
  return new HistoryService();
});

const getEmptyEbtManager = once(async () => {
  const { DiscoverEBTManager } = await getSharedServices();
  return new DiscoverEBTManager(); // It is not initialized outside of Discover
});
