/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, map, Observable } from 'rxjs';
import {
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
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE, TRUNCATE_MAX_HEIGHT } from '@kbn/discover-utils';
import { SavedSearchAttributes, SavedSearchType } from '@kbn/saved-search-plugin/common';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';
import { registerFeature } from './register_feature';
import { buildServices, UrlTracker } from './build_services';
import { ViewSavedSearchAction } from './embeddable/actions/view_saved_search_action';
import { injectTruncateStyles } from './utils/truncate_styles';
import { initializeKbnUrlTracking } from './utils/initialize_kbn_url_tracking';
import {
  DiscoverContextAppLocator,
  DiscoverContextAppLocatorDefinition,
} from './application/context/services/locator';
import {
  DiscoverSingleDocLocator,
  DiscoverSingleDocLocatorDefinition,
} from './application/doc/locator';
import {
  DiscoverAppLocator,
  DiscoverAppLocatorDefinition,
  DiscoverESQLLocatorDefinition,
} from '../common';
import { defaultCustomizationContext, DiscoverCustomizationContext } from './customizations';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER } from './embeddable/constants';
import {
  DiscoverContainerInternal,
  type DiscoverContainerProps,
} from './components/discover_container';
import { getESQLSearchProvider } from './global_search/search_provider';
import { HistoryService } from './history_service';
import type { ConfigSchema, ExperimentalFeatures } from '../server/config';
import { DiscoverSetup, DiscoverSetupPlugins, DiscoverStart, DiscoverStartPlugins } from './types';
import { deserializeState } from './embeddable/utils/serialization_utils';
import { DISCOVER_CELL_ACTIONS_TRIGGER } from './context_awareness/types';
import { RootProfileService } from './context_awareness/profiles/root_profile';
import { DataSourceProfileService } from './context_awareness/profiles/data_source_profile';
import { DocumentProfileService } from './context_awareness/profiles/document_profile';
import { ProfilesManager } from './context_awareness/profiles_manager';
import { DiscoverEBTContextManager } from './services/discover_ebt_context_manager';

/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins>
{
  private readonly appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private readonly historyService = new HistoryService();
  private readonly inlineTopNav: Map<string | null, DiscoverCustomizationContext['inlineTopNav']> =
    new Map([[null, defaultCustomizationContext.inlineTopNav]]);
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

      this.locator = plugins.share.url.locators.create(
        new DiscoverAppLocatorDefinition({ useHash, setStateToKbnUrl })
      );
      this.contextLocator = plugins.share.url.locators.create(
        new DiscoverContextAppLocatorDefinition({ useHash })
      );
      this.singleDocLocator = plugins.share.url.locators.create(
        new DiscoverSingleDocLocatorDefinition()
      );
    }

    if (plugins.globalSearch) {
      const enableESQL = core.uiSettings.get(ENABLE_ESQL);
      plugins.globalSearch.registerResultProvider(
        getESQLSearchProvider(
          enableESQL,
          core.getStartServices().then(
            ([
              {
                application: { capabilities },
              },
            ]) => capabilities
          ),
          core.getStartServices().then((deps) => {
            const { data } = deps[1];
            return data;
          }),
          this.locator
        )
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

    const ebtContextManager = new DiscoverEBTContextManager();
    ebtContextManager.initialize({ core });

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

        this.historyService.syncHistoryLocations();
        appMounted();

        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = this.scopedHistory.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        ebtContextManager.enable();

        const services = buildServices({
          core: coreStart,
          plugins: discoverStartPlugins,
          context: this.initializerContext,
          locator: this.locator!,
          contextLocator: this.contextLocator!,
          singleDocLocator: this.singleDocLocator!,
          history: this.historyService.getHistory(),
          scopedHistory: this.scopedHistory,
          urlTracker: this.urlTracker!,
          profilesManager: await this.createProfilesManager(
            coreStart,
            discoverStartPlugins,
            ebtContextManager
          ),
          ebtContextManager,
          setHeaderActionMenu: params.setHeaderActionMenu,
        });

        // make sure the data view list is up to date
        discoverStartPlugins.dataViews.clearCache();

        // FIXME: Temporarily hide overflow-y in Discover app when Field Stats table is shown
        // due to EUI bug https://github.com/elastic/eui/pull/5152
        params.element.classList.add('dscAppWrapper');

        const customizationContext$: Observable<DiscoverCustomizationContext> = services.chrome
          .getActiveSolutionNavId$()
          .pipe(
            map((solutionNavId) => ({
              ...defaultCustomizationContext,
              solutionNavId,
              inlineTopNav:
                this.inlineTopNav.get(solutionNavId) ??
                this.inlineTopNav.get(null) ??
                defaultCustomizationContext.inlineTopNav,
            }))
          );

        const { renderApp } = await import('./application');
        const unmount = renderApp({
          element: params.element,
          services,
          customizationContext$,
          experimentalFeatures: this.experimentalFeatures,
        });

        return () => {
          ebtContextManager.disableAndReset();
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    plugins.urlForwarding.forwardApp('doc', 'discover', (path) => {
      return `#${path}`;
    });
    plugins.urlForwarding.forwardApp('context', 'discover', (path) => {
      const urlParts = path.split('/');
      // take care of urls containing legacy url, those split in the following way
      // ["", "context", indexPatternId, _type, id + params]
      if (urlParts[4]) {
        // remove _type part
        const newPath = [...urlParts.slice(0, 3), ...urlParts.slice(4)].join('/');
        return `#${newPath}`;
      }
      return `#${path}`;
    });
    plugins.urlForwarding.forwardApp('discover', 'discover', (path) => {
      const [, id, tail] = /discover\/([^\?]+)(.*)/.exec(path) || [];
      if (!id) {
        return `#${path.replace('/discover', '') || '/'}`;
      }
      return `#/view/${id}${tail || ''}`;
    });

    if (plugins.home) {
      registerFeature(plugins.home);
    }

    this.registerEmbeddable(core, plugins);

    return {
      locator: this.locator,
      showInlineTopNav: () => {
        this.inlineTopNav.set(null, {
          enabled: true,
          showLogsExplorerTabs: false,
        });
      },
      configureInlineTopNav: (projectNavId, options) => {
        this.inlineTopNav.set(projectNavId, options);
      },
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    const viewSavedSearchAction = new ViewSavedSearchAction(core.application, this.locator!);

    plugins.uiActions.addTriggerAction('CONTEXT_MENU_TRIGGER', viewSavedSearchAction);
    plugins.uiActions.registerTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER);
    plugins.uiActions.registerTrigger(DISCOVER_CELL_ACTIONS_TRIGGER);
    injectTruncateStyles(core.uiSettings.get(TRUNCATE_MAX_HEIGHT));

    const isEsqlEnabled = core.uiSettings.get(ENABLE_ESQL);

    if (plugins.share && this.locator && isEsqlEnabled) {
      plugins.share?.url.locators.create(
        new DiscoverESQLLocatorDefinition({
          discoverAppLocator: this.locator,
          dataViews: plugins.dataViews,
        })
      );
    }

    const getDiscoverServicesInternal = () => {
      return this.getDiscoverServices(
        core,
        plugins,
        this.createEmptyProfilesManager(),
        new DiscoverEBTContextManager() // it's not enabled outside of Discover
      );
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

  private createProfileServices() {
    const rootProfileService = new RootProfileService();
    const dataSourceProfileService = new DataSourceProfileService();
    const documentProfileService = new DocumentProfileService();

    return { rootProfileService, dataSourceProfileService, documentProfileService };
  }

  private createProfilesManager = async (
    core: CoreStart,
    plugins: DiscoverStartPlugins,
    ebtContextManager: DiscoverEBTContextManager
  ) => {
    const { registerProfileProviders } = await import('./context_awareness/profile_providers');
    const { rootProfileService, dataSourceProfileService, documentProfileService } =
      this.createProfileServices();

    const enabledExperimentalProfileIds = this.experimentalFeatures.enabledProfiles ?? [];

    const profilesManager = new ProfilesManager(
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      ebtContextManager
    );

    await registerProfileProviders({
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      enabledExperimentalProfileIds,
      services: this.getDiscoverServices(core, plugins, profilesManager, ebtContextManager),
    });

    return profilesManager;
  };

  private createEmptyProfilesManager() {
    const { rootProfileService, dataSourceProfileService, documentProfileService } =
      this.createProfileServices();

    return new ProfilesManager(
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      new DiscoverEBTContextManager() // it's not enabled outside of Discover
    );
  }

  private getDiscoverServices = (
    core: CoreStart,
    plugins: DiscoverStartPlugins,
    profilesManager: ProfilesManager,
    ebtContextManager: DiscoverEBTContextManager
  ) => {
    return buildServices({
      core,
      plugins,
      context: this.initializerContext,
      locator: this.locator!,
      contextLocator: this.contextLocator!,
      singleDocLocator: this.singleDocLocator!,
      history: this.historyService.getHistory(),
      urlTracker: this.urlTracker!,
      profilesManager,
      ebtContextManager,
    });
  };

  private registerEmbeddable(core: CoreSetup<DiscoverStartPlugins>, plugins: DiscoverSetupPlugins) {
    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        executeTriggerActions: deps.uiActions.executeTriggerActions,
        isEditable: () => coreStart.application.capabilities.discover.save as boolean,
      };
    };

    const getDiscoverServicesInternal = async () => {
      const [coreStart, deps] = await core.getStartServices();
      const ebtContextManager = new DiscoverEBTContextManager(); // it's not enabled outside of Discover
      const profilesManager = await this.createProfilesManager(coreStart, deps, ebtContextManager);
      return this.getDiscoverServices(coreStart, deps, profilesManager, ebtContextManager);
    };

    plugins.embeddable.registerReactEmbeddableSavedObject<SavedSearchAttributes>({
      onAdd: async (container, savedObject) => {
        const services = await getDiscoverServicesInternal();
        const initialState = await deserializeState({
          serializedState: {
            rawState: { savedObjectId: savedObject.id },
            references: savedObject.references,
          },
          discoverServices: services,
        });
        container.addNewPanel({
          panelType: SEARCH_EMBEDDABLE_TYPE,
          initialState,
        });
      },
      embeddableType: SEARCH_EMBEDDABLE_TYPE,
      savedObjectType: SavedSearchType,
      savedObjectName: i18n.translate('discover.savedSearch.savedObjectName', {
        defaultMessage: 'Saved search',
      }),
      getIconForSavedObject: () => 'discoverApp',
    });

    plugins.embeddable.registerReactEmbeddableFactory(SEARCH_EMBEDDABLE_TYPE, async () => {
      const [startServices, discoverServices, { getSearchEmbeddableFactory }] = await Promise.all([
        getStartServices(),
        getDiscoverServicesInternal(),
        import('./embeddable/get_search_embeddable_factory'),
      ]);

      return getSearchEmbeddableFactory({
        startServices,
        discoverServices,
      });
    });
  }
}
