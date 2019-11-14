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

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import angular from 'angular';
import { IUiActionsStart } from 'src/plugins/ui_actions/public';
import { registerFeature } from './helpers/register_feature';
import './kibana_services';
import {
  Start as EmbeddableStart,
  Setup as EmbeddableSetup,
} from '../../../../../plugins/embeddable/public';

import { LocalApplicationService } from '../local_application_service';
import { getGlobalAngular } from './get_global_angular';
import { getAngularModule, getAngularModuleEmbeddable } from './get_inner_angular';
import { setServices } from './kibana_services';
import { NavigationStart } from '../../../navigation/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type DiscoverSetup = void;
export type DiscoverStart = void;
interface DiscoverSetupPlugins {
  uiActions: IUiActionsStart;
  embeddable: EmbeddableSetup;
  localApplicationService: LocalApplicationService;
}
interface DiscoverStartPlugins {
  uiActions: IUiActionsStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
}
const innerAngularName = 'app/discover';
const embeddableAngularName = 'app/discoverEmbeddable';

export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  private globalAngularBootstrapped: boolean = false;
  private innerAngularBootstrapped: boolean = false;
  /**
   * why is this public? it's still needed for some tests, remove once all is jest
   */
  public bootstrapInnerAngular?: () => void;
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: DiscoverSetupPlugins): DiscoverSetup {
    registerFeature();
    plugins.localApplicationService.register({
      id: 'discover',
      title: 'Discover',
      order: -1004,
      euiIconType: 'discoverApp',
      mount: async (context, params) => {
        await this.bootstrapGlobalAngular();
        if (!this.bootstrapInnerAngular) {
          // TODO to be improved
          throw Error('Discover plugin bootstrapInnerAngular is undefined');
        }
        if (!this.innerAngularBootstrapped) {
          await this.bootstrapInnerAngular();
        }
        const { renderApp } = await import('./application');
        return renderApp(innerAngularName, params.element);
      },
    });
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    this.bootstrapInnerAngular = async () => {
      // this is used by application mount and tests
      // don't add 'bootstrapGlobalAngular' here, or mocha tests will fail
      if (!this.innerAngularBootstrapped) {
        getAngularModule(innerAngularName, core, plugins);
        this.innerAngularBootstrapped = true;
      }
    };
    this.registerEmbeddable(core, plugins);
  }

  private async bootstrapGlobalAngular() {
    if (!this.globalAngularBootstrapped) {
      const angularDeps = await getGlobalAngular();
      setServices(angularDeps);
      this.globalAngularBootstrapped = true;
    }
    return true;
  }

  private async registerEmbeddable(core: CoreStart, plugins: DiscoverStartPlugins) {
    const { SearchEmbeddableFactory } = await import('./embeddable');
    // bootstrap inner Angular for embeddable, return injector
    const getInjector = async () => {
      await this.bootstrapGlobalAngular();
      getAngularModuleEmbeddable(embeddableAngularName, core, plugins);
      const mountpoint = document.createElement('div');
      return angular.bootstrap(mountpoint, [embeddableAngularName]);
    };

    const factory = new SearchEmbeddableFactory(
      plugins.uiActions.executeTriggerActions,
      getInjector
    );
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
