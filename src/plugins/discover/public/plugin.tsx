/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import { SharePluginStart, SharePluginSetup } from 'src/plugins/share/public';
import { UrlForwardingSetup, UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { Start as InspectorPublicPluginStart } from 'src/plugins/inspector/public';
import { EuiLoadingContent } from '@elastic/eui';
import { SharedUXPluginStart } from 'src/plugins/shared_ux/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public';
import { SavedObjectsStart } from '../../saved_objects/public';
import { DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { DocViewInput, DocViewInputFn } from './services/doc_views/doc_views_types';
import { DocViewsRegistry } from './services/doc_views/doc_views_registry';
import {
  setDocViewsRegistry,
  setHeaderActionMenuMounter,
  setScopedHistory,
  setUiActions,
  setUrlTracker,
  syncHistoryLocations,
} from './kibana_services';
import { registerFeature } from './register_feature';
import { buildServices } from './build_services';
import { DiscoverAppLocator, DiscoverAppLocatorDefinition } from './locator';
import { SearchEmbeddableFactory } from './embeddable';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { IndexPatternFieldEditorStart } from '../../../plugins/data_view_field_editor/public';
import { DeferredSpinner } from './components';
import { ViewSavedSearchAction } from './embeddable/view_saved_search_action';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';
import { FieldFormatsStart } from '../../field_formats/public';
import { injectTruncateStyles } from './utils/truncate_styles';
import { DOC_TABLE_LEGACY, TRUNCATE_MAX_HEIGHT } from '../common';
import { DataViewEditorStart } from '../../../plugins/data_view_editor/public';
import { useDiscoverServices } from './utils/use_discover_services';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../../x-pack/plugins/triggers_actions_ui/public';
import { initializeKbnUrlTracking } from './utils/initialize_kbn_url_tracking';

const DocViewerLegacyTable = React.lazy(
  () => import('./services/doc_views/components/doc_viewer_table/legacy')
);
const DocViewerTable = React.lazy(() => import('./services/doc_views/components/doc_viewer_table'));
const SourceViewer = React.lazy(() => import('./services/doc_views/components/doc_viewer_source'));

/**
 * @public
 */
export interface DiscoverSetup {
  docViews: {
    /**
     * Add new doc view shown along with table view and json view in the details of each document in Discover.
     * @param docViewRaw
     */
    addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
  };

  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
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
  readonly locator: undefined | DiscoverAppLocator;
}

export interface DiscoverStart {
  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
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
  readonly locator: undefined | DiscoverAppLocator;
}

/**
 * @internal
 */
export interface DiscoverSetupPlugins {
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
}

/**
 * @internal
 */
export interface DiscoverStartPlugins {
  dataViewEditor: DataViewEditorStart;
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  inspector: InspectorPublicPluginStart;
  savedObjects: SavedObjectsStart;
  usageCollection?: UsageCollectionSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  sharedUX: SharedUXPluginStart;
}

/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins>
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private docViewsRegistry: DocViewsRegistry | null = null;
  private stopUrlTracking: (() => void) | undefined = undefined;
  private locator?: DiscoverAppLocator;

  setup(core: CoreSetup<DiscoverStartPlugins, DiscoverStart>, plugins: DiscoverSetupPlugins) {
    const baseUrl = core.http.basePath.prepend('/app/discover');

    if (plugins.share) {
      this.locator = plugins.share.url.locators.create(
        new DiscoverAppLocatorDefinition({
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
      component: (props) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const services = useDiscoverServices();
        const DocView = services.uiSettings.get(DOC_TABLE_LEGACY)
          ? DocViewerLegacyTable
          : DocViewerTable;

        return (
          <React.Suspense
            fallback={
              <DeferredSpinner>
                <EuiLoadingContent />
              </DeferredSpinner>
            }
          >
            <DocView {...props} />
          </React.Suspense>
        );
      },
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: ({ hit, indexPattern }) => (
        <React.Suspense
          fallback={
            <DeferredSpinner>
              <EuiLoadingContent />
            </DeferredSpinner>
          }
        >
          <SourceViewer
            index={hit._index}
            id={hit._id}
            indexPattern={indexPattern}
            hasLineNumbers
          />
        </React.Suspense>
      ),
    });

    const { setTrackedUrl, restorePreviousUrl, stopUrlTracker, appMounted, appUnMounted } =
      initializeKbnUrlTracking(baseUrl, core, this.appStateUpdater, plugins);
    setUrlTracker({ setTrackedUrl, restorePreviousUrl });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    core.application.register({
      id: 'discover',
      title: 'Discover',
      updater$: this.appStateUpdater.asObservable(),
      order: 1000,
      euiIconType: 'logoKibana',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        const [coreStart, discoverStartPlugins] = await core.getStartServices();
        setScopedHistory(params.history);
        setHeaderActionMenuMounter(params.setHeaderActionMenu);
        syncHistoryLocations();
        appMounted();
        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = params.history.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        const services = buildServices(
          coreStart,
          discoverStartPlugins,
          this.initializerContext,
          this.locator!
        );

        // make sure the index pattern list is up to date
        await discoverStartPlugins.data.indexPatterns.clearCache();

        const { renderApp } = await import('./application');
        // FIXME: Temporarily hide overflow-y in Discover app when Field Stats table is shown
        // due to EUI bug https://github.com/elastic/eui/pull/5152
        params.element.classList.add('dscAppWrapper');
        const unmount = renderApp(params.element, services);
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
      docViews: {
        addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
      },
      locator: this.locator,
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins) {
    // we need to register the application service at setup, but to render it
    // there are some start dependencies necessary, for this reason
    // initializeServices are assigned at start and used
    // when the application/embeddable is mounted

    const { uiActions } = plugins;

    const viewSavedSearchAction = new ViewSavedSearchAction(core.application);
    uiActions.addTriggerAction('CONTEXT_MENU_TRIGGER', viewSavedSearchAction);
    setUiActions(plugins.uiActions);

    injectTruncateStyles(core.uiSettings.get(TRUNCATE_MAX_HEIGHT));

    return {
      locator: this.locator,
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  private registerEmbeddable(core: CoreSetup<DiscoverStartPlugins>, plugins: DiscoverSetupPlugins) {
    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        executeTriggerActions: deps.uiActions.executeTriggerActions,
        isEditable: () => coreStart.application.capabilities.discover.save as boolean,
      };
    };

    const getDiscoverServices = async () => {
      const [coreStart, discoverStartPlugins] = await core.getStartServices();
      return buildServices(coreStart, discoverStartPlugins, this.initializerContext, this.locator!);
    };

    const factory = new SearchEmbeddableFactory(getStartServices, getDiscoverServices);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
