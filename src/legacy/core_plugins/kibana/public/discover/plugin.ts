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
}
interface DiscoverStartPlugins {
  uiActions: IUiActionsStart;
  embeddable: EmbeddableStart;
}

export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: DiscoverSetupPlugins): DiscoverSetup {
    registerFeature();
    require('./angular');
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    // TODO enable this when possible, seems it broke a functional test:
    // dashboard mode Dashboard View Mode Dashboard viewer can paginate on a saved search
    // const factory = new SearchEmbeddableFactory(plugins.uiActions.executeTriggerActions);
    // plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  stop() {}
}
