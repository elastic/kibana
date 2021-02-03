/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
  AppMountParameters,
  AppUpdater,
  ScopedHistory,
  AppNavLinkStatus,
} from '../../../core/public';
import { Panel } from './panels/panel';
import { initAngularBootstrap } from '../../kibana_legacy/public';
import { createKbnUrlTracker } from '../../kibana_utils/public';
import { DataPublicPluginStart, esFilters, DataPublicPluginSetup } from '../../data/public';
import { NavigationPublicPluginStart } from '../../navigation/public';
import { VisualizationsStart } from '../../visualizations/public';
import { SavedObjectsStart } from '../../saved_objects/public';
import {
  VisTypeTimelionPluginStart,
  VisTypeTimelionPluginSetup,
} from '../../vis_type_timelion/public';

export interface TimelionPluginSetupDependencies {
  data: DataPublicPluginSetup;
  visTypeTimelion: VisTypeTimelionPluginSetup;
}

export interface TimelionPluginStartDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  visualizations: VisualizationsStart;
  visTypeTimelion: VisTypeTimelionPluginStart;
  savedObjects: SavedObjectsStart;
}

/** @internal */
export class TimelionPlugin
  implements Plugin<void, void, TimelionPluginSetupDependencies, TimelionPluginStartDependencies> {
  initializerContext: PluginInitializerContext;
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<TimelionPluginStartDependencies>,
    {
      data,
      visTypeTimelion,
    }: { data: DataPublicPluginSetup; visTypeTimelion: VisTypeTimelionPluginSetup }
  ) {
    const timelionPanels: Map<string, Panel> = new Map();

    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/timelion'),
      defaultSubUrl: '#/',
      storageKey: `lastUrl:${core.http.basePath.get()}:timelion`,
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          kbnUrlKey: '_g',
          stateUpdate$: data.query.state$.pipe(
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
      getHistory: () => this.currentHistory!,
    });

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    initAngularBootstrap();
    core.application.register({
      id: 'timelion',
      title: 'Timelion',
      order: 8000,
      defaultPath: '#/',
      euiIconType: 'logoKibana',
      category: DEFAULT_APP_CATEGORIES.kibana,
      navLinkStatus:
        visTypeTimelion.isUiEnabled === false ? AppNavLinkStatus.hidden : AppNavLinkStatus.default,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        this.currentHistory = params.history;

        appMounted();

        const unlistenParentHistory = params.history.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        const { renderApp } = await import('./application');
        params.element.classList.add('timelionAppContainer');
        const unmount = renderApp({
          mountParams: params,
          pluginInitializerContext: this.initializerContext,
          timelionPanels,
          core: coreStart,
          plugins: pluginsStart,
        });
        return () => {
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });
  }

  public start() {}

  public stop(): void {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
