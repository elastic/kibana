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
import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import angular, { auto } from 'angular';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import {
  DataPublicPluginStart,
  DataPublicPluginSetup,
  getQueryStateContainer,
} from '../../../../../plugins/data/public';
import { registerFeature } from './np_ready/register_feature';
import './kibana_services';
import { IEmbeddableStart, IEmbeddableSetup } from '../../../../../plugins/embeddable/public';
import { getInnerAngularModule, getInnerAngularModuleEmbeddable } from './get_inner_angular';
import { setAngularModule, setServices } from './kibana_services';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { ChartsPluginStart } from '../../../../../plugins/charts/public';
import { buildServices } from './build_services';
import { SharePluginStart } from '../../../../../plugins/share/public';
import {
  KibanaLegacySetup,
  AngularRenderedAppUpdater,
} from '../../../../../plugins/kibana_legacy/public';
import { DocViewsRegistry } from './np_ready/doc_views/doc_views_registry';
import { DocViewInput, DocViewInputFn } from './np_ready/doc_views/doc_views_types';
import { DocViewTable } from './np_ready/components/table/table';
import { JsonCodeBlock } from './np_ready/components/json_code_block/json_code_block';
import { HomePublicPluginSetup } from '../../../../../plugins/home/public';
import {
  VisualizationsStart,
  VisualizationsSetup,
} from '../../../visualizations/public/np_ready/public';
import { createKbnUrlTracker } from '../../../../../plugins/kibana_utils/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export interface DiscoverSetup {
  addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
}
export type DiscoverStart = void;
export interface DiscoverSetupPlugins {
  uiActions: UiActionsSetup;
  embeddable: IEmbeddableSetup;
  kibanaLegacy: KibanaLegacySetup;
  home: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
}
export interface DiscoverStartPlugins {
  uiActions: UiActionsStart;
  embeddable: IEmbeddableStart;
  navigation: NavigationStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  share: SharePluginStart;
  inspector: any;
  visualizations: VisualizationsStart;
}
const innerAngularName = 'app/discover';
const embeddableAngularName = 'app/discoverEmbeddable';

/**
 * Contains Discover, one of the oldest parts of Kibana
 * There are 2 kinds of Angular bootstrapped for rendering, additionally to the main Angular
 * Discover provides embeddables, those contain a slimmer Angular
 */
export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  private servicesInitialized: boolean = false;
  private innerAngularInitialized: boolean = false;
  private docViewsRegistry: DocViewsRegistry | null = null;
  private embeddableInjector: auto.IInjectorService | null = null;
  private getEmbeddableInjector: (() => Promise<auto.IInjectorService>) | null = null;
  private appStateUpdater = new BehaviorSubject<AngularRenderedAppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  /**
   * why are those functions public? they are needed for some mocha tests
   * can be removed once all is Jest
   */
  public initializeInnerAngular?: () => void;
  public initializeServices?: () => Promise<{ core: CoreStart; plugins: DiscoverStartPlugins }>;

  setup(core: CoreSetup, plugins: DiscoverSetupPlugins): DiscoverSetup {
    const { querySyncStateContainer, stop: stopQuerySyncStateContainer } = getQueryStateContainer(
      plugins.data.query
    );
    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana'),
      defaultSubUrl: '#/discover',
      storageKey: 'lastUrl:discover',
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          kbnUrlKey: '_g',
          stateUpdate$: querySyncStateContainer.state$,
        },
      ],
    });
    this.stopUrlTracking = () => {
      stopQuerySyncStateContainer();
      stopUrlTracker();
    };

    this.getEmbeddableInjector = this.getInjector.bind(this);
    this.docViewsRegistry = new DocViewsRegistry(this.getEmbeddableInjector);
    this.docViewsRegistry.addDocView({
      title: i18n.translate('kbn.discover.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: DocViewTable,
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('kbn.discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: JsonCodeBlock,
    });
    plugins.kibanaLegacy.registerLegacyApp({
      id: 'discover',
      title: 'Discover',
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:discover',
      order: -1004,
      euiIconType: 'discoverApp',
      mount: async (params: AppMountParameters) => {
        if (!this.initializeServices) {
          throw Error('Discover plugin method initializeServices is undefined');
        }
        if (!this.initializeInnerAngular) {
          throw Error('Discover plugin method initializeInnerAngular is undefined');
        }
        appMounted();
        await this.initializeServices();
        await this.initializeInnerAngular();

        const { renderApp } = await import('./np_ready/application');
        const unmount = await renderApp(innerAngularName, params.element);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    });
    registerFeature(plugins.home);

    return {
      addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    // we need to register the application service at setup, but to render it
    // there are some start dependencies necessary, for this reason
    // initializeInnerAngular + initializeServices are assigned at start and used
    // when the application/embeddable is mounted
    this.initializeInnerAngular = async () => {
      if (this.innerAngularInitialized) {
        return;
      }
      // this is used by application mount and tests
      const module = getInnerAngularModule(innerAngularName, core, plugins);
      setAngularModule(module);
      this.innerAngularInitialized = true;
    };

    this.initializeServices = async () => {
      if (this.servicesInitialized) {
        return { core, plugins };
      }
      const services = await buildServices(core, plugins, this.docViewsRegistry!);
      setServices(services);
      this.servicesInitialized = true;

      return { core, plugins };
    };

    this.registerEmbeddable(core, plugins);
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  /**
   * register embeddable with a slimmer embeddable version of inner angular
   */
  private async registerEmbeddable(core: CoreStart, plugins: DiscoverStartPlugins) {
    const { SearchEmbeddableFactory } = await import('./np_ready/embeddable');
    const isEditable = () => core.application.capabilities.discover.save as boolean;

    if (!this.getEmbeddableInjector) {
      throw Error('Discover plugin method getEmbeddableInjector is undefined');
    }

    const factory = new SearchEmbeddableFactory(
      plugins.uiActions.executeTriggerActions,
      this.getEmbeddableInjector,
      isEditable
    );
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  private async getInjector() {
    if (!this.embeddableInjector) {
      if (!this.initializeServices) {
        throw Error('Discover plugin getEmbeddableInjector:  initializeServices is undefined');
      }
      const { core, plugins } = await this.initializeServices();
      getInnerAngularModuleEmbeddable(embeddableAngularName, core, plugins);
      const mountpoint = document.createElement('div');
      this.embeddableInjector = angular.bootstrap(mountpoint, [embeddableAngularName]);
    }

    return this.embeddableInjector;
  }
}
