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
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import angular from 'angular';
import { IUiActionsStart } from 'src/plugins/ui_actions/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { registerFeature } from './np_ready/register_feature';
import './kibana_services';
import { IEmbeddableStart, IEmbeddableSetup } from '../../../../../plugins/embeddable/public';
import { getInnerAngularModule, getInnerAngularModuleEmbeddable } from './get_inner_angular';
import { setAngularModule, setServices } from './kibana_services';
import { NavigationStart } from '../../../navigation/public';
import { EuiUtilsStart } from '../../../../../plugins/eui_utils/public';
import { buildServices } from './build_services';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { HomePublicPluginSetup } from '../../../../../plugins/home/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type DiscoverSetup = void;
export type DiscoverStart = void;
export interface DiscoverSetupPlugins {
  uiActions: IUiActionsStart;
  embeddable: IEmbeddableSetup;
  kibana_legacy: KibanaLegacySetup;
  home: HomePublicPluginSetup;
}
export interface DiscoverStartPlugins {
  uiActions: IUiActionsStart;
  embeddable: IEmbeddableStart;
  navigation: NavigationStart;
  eui_utils: EuiUtilsStart;
  data: DataPublicPluginStart;
  share: SharePluginStart;
  inspector: any;
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
  /**
   * why are those functions public? they are needed for some mocha tests
   * can be removed once all is Jest
   */
  public initializeInnerAngular?: () => void;
  public initializeServices?: () => void;
  setup(core: CoreSetup, plugins: DiscoverSetupPlugins): DiscoverSetup {
    plugins.kibana_legacy.registerLegacyApp({
      id: 'discover',
      title: 'Discover',
      order: -1004,
      euiIconType: 'discoverApp',
      mount: async (params: AppMountParameters) => {
        if (!this.initializeServices) {
          throw Error('Discover plugin method initializeServices is undefined');
        }
        if (!this.initializeInnerAngular) {
          throw Error('Discover plugin method initializeInnerAngular is undefined');
        }
        await this.initializeServices();
        await this.initializeInnerAngular();
        const { renderApp } = await import('./np_ready/application');
        return renderApp(innerAngularName, params.element);
      },
    });
    registerFeature(plugins.home);
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
        return;
      }
      const services = await buildServices(core, plugins);
      setServices(services);
      this.servicesInitialized = true;
    };

    this.registerEmbeddable(core, plugins);
  }

  /**
   * register embeddable with a slimmer embeddable version of inner angular
   */
  private async registerEmbeddable(core: CoreStart, plugins: DiscoverStartPlugins) {
    const { SearchEmbeddableFactory } = await import('./np_ready/embeddable');
    const getInjector = async () => {
      if (!this.initializeServices) {
        throw Error('Discover plugin registerEmbeddable:  initializeServices is undefined');
      }
      await this.initializeServices();
      getInnerAngularModuleEmbeddable(embeddableAngularName, core, plugins);
      const mountpoint = document.createElement('div');
      return angular.bootstrap(mountpoint, [embeddableAngularName]);
    };
    const isEditable = () => core.application.capabilities.discover.save as boolean;

    const factory = new SearchEmbeddableFactory(
      plugins.uiActions.executeTriggerActions,
      getInjector,
      isEditable
    );
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
