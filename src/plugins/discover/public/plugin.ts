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

import { i18n } from '@kbn/i18n';
import angular, { auto } from 'angular';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { UiActionsStart, UiActionsSetup } from 'src/plugins/ui_actions/public';
import { EmbeddableStart, EmbeddableSetup } from 'src/plugins/embeddable/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import { SharePluginStart, SharePluginSetup, UrlGeneratorContract } from 'src/plugins/share/public';
import { VisualizationsStart, VisualizationsSetup } from 'src/plugins/visualizations/public';
import { KibanaLegacySetup, KibanaLegacyStart } from 'src/plugins/kibana_legacy/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';
import { SavedObjectLoader } from '../../saved_objects/public';
import { createKbnUrlTracker } from '../../kibana_utils/public';
import { DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { UrlGeneratorState } from '../../share/public';
import { DocViewInput, DocViewInputFn } from './application/doc_views/doc_views_types';
import { DocViewsRegistry } from './application/doc_views/doc_views_registry';
import { DocViewTable } from './application/components/table/table';
import { JsonCodeBlock } from './application/components/json_code_block/json_code_block';
import {
  setDocViewsRegistry,
  setUrlTracker,
  setAngularModule,
  setServices,
  setUiActions,
  setScopedHistory,
  getScopedHistory,
  syncHistoryLocations,
  getServices,
} from './kibana_services';
import { createSavedSearchesLoader } from './saved_searches';
import { registerFeature } from './register_feature';
import { buildServices } from './build_services';
import {
  DiscoverUrlGeneratorState,
  DISCOVER_APP_URL_GENERATOR,
  DiscoverUrlGenerator,
} from './url_generator';
import { SearchEmbeddableFactory } from './application/embeddable';

declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [DISCOVER_APP_URL_GENERATOR]: UrlGeneratorState<DiscoverUrlGeneratorState>;
  }
}

/**
 * @public
 */
export interface DiscoverSetup {
  docViews: {
    /**
     * Add new doc view shown along with table view and json view in the details of each document in Discover.
     * Both react and angular doc views are supported.
     * @param docViewRaw
     */
    addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
  };
}

export interface DiscoverStart {
  savedSearchLoader: SavedObjectLoader;

  /**
   * `share` plugin URL generator for Discover app. Use it to generate links into
   * Discover application, example:
   *
   * ```ts
   * const url = await plugins.discover.urlGenerator.createUrl({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   */
  readonly urlGenerator: undefined | UrlGeneratorContract<'DISCOVER_APP_URL_GENERATOR'>;
}

/**
 * @internal
 */
export interface DiscoverSetupPlugins {
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
  kibanaLegacy: KibanaLegacySetup;
  home?: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
}

/**
 * @internal
 */
export interface DiscoverStartPlugins {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  share?: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
  inspector: InspectorPublicPluginStart;
  visualizations: VisualizationsStart;
}

const innerAngularName = 'app/discover';
const embeddableAngularName = 'app/discoverEmbeddable';

/**
 * Contains Discover, one of the oldest parts of Kibana
 * There are 2 kinds of Angular bootstrapped for rendering, additionally to the main Angular
 * Discover provides embeddables, those contain a slimmer Angular
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private docViewsRegistry: DocViewsRegistry | null = null;
  private embeddableInjector: auto.IInjectorService | null = null;
  private stopUrlTracking: (() => void) | undefined = undefined;
  private servicesInitialized: boolean = false;
  private innerAngularInitialized: boolean = false;
  private urlGenerator?: DiscoverStart['urlGenerator'];

  /**
   * why are those functions public? they are needed for some mocha tests
   * can be removed once all is Jest
   */
  public initializeInnerAngular?: () => void;
  public initializeServices?: () => Promise<{ core: CoreStart; plugins: DiscoverStartPlugins }>;

  setup(core: CoreSetup<DiscoverStartPlugins, DiscoverStart>, plugins: DiscoverSetupPlugins) {
    const baseUrl = core.http.basePath.prepend('/app/discover');

    if (plugins.share) {
      this.urlGenerator = plugins.share.urlGenerators.registerUrlGenerator(
        new DiscoverUrlGenerator({
          appBasePath: baseUrl,
          useHash: core.uiSettings.get('state:storeInSessionStorage'),
        })
      );
    }

    this.docViewsRegistry = new DocViewsRegistry();
    setDocViewsRegistry(this.docViewsRegistry);
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: DocViewTable,
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: JsonCodeBlock,
    });

    const {
      appMounted,
      appUnMounted,
      stop: stopUrlTracker,
      setActiveUrl: setTrackedUrl,
      restorePreviousUrl,
    } = createKbnUrlTracker({
      // we pass getter here instead of plain `history`,
      // so history is lazily created (when app is mounted)
      // this prevents redundant `#` when not in discover app
      getHistory: getScopedHistory,
      baseUrl,
      defaultSubUrl: '#/',
      storageKey: `lastUrl:${core.http.basePath.get()}:discover`,
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          kbnUrlKey: '_g',
          stateUpdate$: plugins.data.query.state$.pipe(
            filter(
              ({ changes }) => !!(changes.globalFilters || changes.time || changes.refreshInterval)
            ),
            map(({ state }) => ({
              ...state,
              filters: state.filters?.filter(esFilters.isFilterPinned),
            }))
          ),
        },
      ],
    });
    setUrlTracker({ setTrackedUrl, restorePreviousUrl });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    this.docViewsRegistry.setAngularInjectorGetter(this.getEmbeddableInjector);
    core.application.register({
      id: 'discover',
      title: 'Discover',
      updater$: this.appStateUpdater.asObservable(),
      order: 1000,
      euiIconType: 'discoverApp',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        if (!this.initializeServices) {
          throw Error('Discover plugin method initializeServices is undefined');
        }
        if (!this.initializeInnerAngular) {
          throw Error('Discover plugin method initializeInnerAngular is undefined');
        }
        setScopedHistory(params.history);
        syncHistoryLocations();
        appMounted();
        const {
          plugins: { data: dataStart },
        } = await this.initializeServices();
        await this.initializeInnerAngular();

        // make sure the index pattern list is up to date
        await dataStart.indexPatterns.clearCache();
        const { renderApp } = await import('./application/application');
        params.element.classList.add('dscAppWrapper');
        const unmount = await renderApp(innerAngularName, params.element);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    });

    plugins.kibanaLegacy.forwardApp('doc', 'discover', (path) => {
      return `#${path}`;
    });
    plugins.kibanaLegacy.forwardApp('context', 'discover', (path) => {
      return `#${path}`;
    });
    plugins.kibanaLegacy.forwardApp('discover', 'discover', (path) => {
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
      docViews: {
        addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
      },
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins) {
    // we need to register the application service at setup, but to render it
    // there are some start dependencies necessary, for this reason
    // initializeInnerAngular + initializeServices are assigned at start and used
    // when the application/embeddable is mounted
    this.initializeInnerAngular = async () => {
      if (this.innerAngularInitialized) {
        return;
      }
      // this is used by application mount and tests
      const { getInnerAngularModule } = await import('./get_inner_angular');
      const module = getInnerAngularModule(
        innerAngularName,
        core,
        plugins,
        this.initializerContext
      );
      setAngularModule(module);
      this.innerAngularInitialized = true;
    };

    setUiActions(plugins.uiActions);

    this.initializeServices = async () => {
      if (this.servicesInitialized) {
        return { core, plugins };
      }
      const services = await buildServices(core, plugins, this.initializerContext);
      setServices(services);
      this.servicesInitialized = true;

      return { core, plugins };
    };

    return {
      urlGenerator: this.urlGenerator,
      savedSearchLoader: createSavedSearchesLoader({
        savedObjectsClient: core.savedObjects.client,
        indexPatterns: plugins.data.indexPatterns,
        search: plugins.data.search,
        chrome: core.chrome,
        overlays: core.overlays,
      }),
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  /**
   * register embeddable with a slimmer embeddable version of inner angular
   */
  private registerEmbeddable(core: CoreSetup<DiscoverStartPlugins>, plugins: DiscoverSetupPlugins) {
    if (!this.getEmbeddableInjector) {
      throw Error('Discover plugin method getEmbeddableInjector is undefined');
    }

    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        executeTriggerActions: deps.uiActions.executeTriggerActions,
        isEditable: () => coreStart.application.capabilities.discover.save as boolean,
      };
    };

    const factory = new SearchEmbeddableFactory(getStartServices, this.getEmbeddableInjector);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  private getEmbeddableInjector = async () => {
    if (!this.embeddableInjector) {
      if (!this.initializeServices) {
        throw Error('Discover plugin getEmbeddableInjector:  initializeServices is undefined');
      }
      const { core, plugins } = await this.initializeServices();
      getServices().kibanaLegacy.loadFontAwesome();
      const { getInnerAngularModuleEmbeddable } = await import('./get_inner_angular');
      getInnerAngularModuleEmbeddable(
        embeddableAngularName,
        core,
        plugins,
        this.initializerContext
      );
      const mountpoint = document.createElement('div');
      this.embeddableInjector = angular.bootstrap(mountpoint, [embeddableAngularName]);
    }

    return this.embeddableInjector;
  };
}
