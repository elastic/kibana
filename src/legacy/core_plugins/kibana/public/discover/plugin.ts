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
import { IUiActionsStart } from 'src/plugins/ui_actions/public';
import { registerFeature } from './helpers/register_feature';
import './kibana_services';
import {
  Start as EmbeddableStart,
  Setup as EmbeddableSetup,
} from '../../../../../plugins/embeddable/public';
import { LocalApplicationService } from '../local_application_service';
import { getGlobalAngular } from './get_global_angular';
import { getAngularModule } from './get_inner_angular';
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

export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  private innerAngular: any;
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: DiscoverSetupPlugins): DiscoverSetup {
    registerFeature();
    plugins.localApplicationService.register({
      id: 'discover',
      title: 'Discover',
      order: -1004,
      euiIconType: 'discoverApp',
      mount: async (context, params) => {
        const { renderApp } = await import('./render_app');
        return renderApp(params.element, params.appBasePath);
      },
    });
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    this.bootstrapAngular(core, plugins);
    this.registerEmbeddable(plugins);
  }

  stop() {}

  private async bootstrapAngular(core: CoreStart, plugins: DiscoverStartPlugins) {
    if (!this.innerAngular) {
      const innerAngular = getAngularModule(core, plugins);
      const angularDeps = await getGlobalAngular();
      setServices(angularDeps);
      this.innerAngular = innerAngular;
    }
  }

  private async registerEmbeddable(plugins: DiscoverStartPlugins) {
    const { SearchEmbeddableFactory } = await import('./embeddable');
    const factory = new SearchEmbeddableFactory(plugins.uiActions.executeTriggerActions);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
