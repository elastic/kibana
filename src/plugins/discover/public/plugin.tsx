/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { TRUNCATE_MAX_HEIGHT } from '@kbn/discover-utils';
import { once } from 'lodash';
import { PLUGIN_ID } from '../common';
import { registerFeature } from './register_feature';
import { buildServices, UrlTracker } from './build_services';
import { SearchEmbeddableFactory } from './embeddable';
import { ViewSavedSearchAction } from './embeddable/view_saved_search_action';
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
import { ConfigSchema, ExperimentalFeatures } from '../common/config';
import {
  DataSourceProfileService,
  DocumentProfileService,
  ProfilesManager,
  RootProfileService,
} from './context_awareness';
import { DiscoverSetup, DiscoverSetupPlugins, DiscoverStart, DiscoverStartPlugins } from './types';

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
          profilesManager: await this.createProfilesManager(),
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
    injectTruncateStyles(core.uiSettings.get(TRUNCATE_MAX_HEIGHT));

    const isEsqlEnabled = core.uiSettings.get(ENABLE_ESQL);

    if (plugins.share && this.locator && isEsqlEnabled) {
      plugins.share?.url.locators.create(
        new DiscoverESQLLocatorDefinition({
          discoverAppLocator: this.locator,
          getIndices: plugins.dataViews.getIndices,
        })
      );
    }

    const getDiscoverServicesInternal = () => {
      return this.getDiscoverServices(core, plugins, this.createEmptyProfilesManager());
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

  private createProfileServices = once(async () => {
    const { registerProfileProviders } = await import('./context_awareness/profile_providers');
    const rootProfileService = new RootProfileService();
    const dataSourceProfileService = new DataSourceProfileService();
    const documentProfileService = new DocumentProfileService();
    const experimentalProfileIds = this.experimentalFeatures.enabledProfiles ?? [];

    registerProfileProviders({
      rootProfileService,
      dataSourceProfileService,
      documentProfileService,
      experimentalProfileIds,
    });

    return { rootProfileService, dataSourceProfileService, documentProfileService };
  });

  private async createProfilesManager() {
    const { rootProfileService, dataSourceProfileService, documentProfileService } =
      await this.createProfileServices();

    return new ProfilesManager(
      rootProfileService,
      dataSourceProfileService,
      documentProfileService
    );
  }

  private createEmptyProfilesManager() {
    return new ProfilesManager(
      new RootProfileService(),
      new DataSourceProfileService(),
      new DocumentProfileService()
    );
  }

  private getDiscoverServices = (
    core: CoreStart,
    plugins: DiscoverStartPlugins,
    profilesManager: ProfilesManager
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
      const profilesManager = await this.createProfilesManager();
      return this.getDiscoverServices(coreStart, deps, profilesManager);
    };

    const factory = new SearchEmbeddableFactory(getStartServices, getDiscoverServicesInternal);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
