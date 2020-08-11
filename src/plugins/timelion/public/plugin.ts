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

import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
  AppMountParameters,
  AppUpdater,
  ScopedHistory,
} from '../../../core/public';
import { Panel } from './panels/panel';
import { initAngularBootstrap, KibanaLegacyStart } from '../../kibana_legacy/public';
import { createKbnUrlTracker } from '../../kibana_utils/public';
import { DataPublicPluginStart, esFilters, DataPublicPluginSetup } from '../../data/public';
import { NavigationPublicPluginStart } from '../../navigation/public';
import { VisualizationsStart } from '../../visualizations/public';
import { VisTypeTimelionPluginStart } from '../../vis_type_timelion/public';

export interface TimelionPluginDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  visualizations: VisualizationsStart;
  visTypeTimelion: VisTypeTimelionPluginStart;
}

/** @internal */
export class TimelionPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext;
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { data }: { data: DataPublicPluginSetup }) {
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
      euiIconType: 'timelionApp',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appStateUpdater.asObservable(),
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
          plugins: pluginsStart as TimelionPluginDependencies,
        });
        return () => {
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });
  }

  public start(core: CoreStart, { kibanaLegacy }: { kibanaLegacy: KibanaLegacyStart }) {
    kibanaLegacy.loadFontAwesome();
  }

  public stop(): void {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
