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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { CONTEXT_MENU_TRIGGER, Plugin as EmbeddablePlugin } from './lib/embeddable_api';
import { ExpandPanelAction, DashboardContainerFactory, DashboardCapabilities } from './lib';

interface SetupDependencies {
  embeddable: ReturnType<EmbeddablePlugin['setup']>;
}

interface StartDependencies {
  embeddable: ReturnType<EmbeddablePlugin['start']>;
}

export class DashboardEmbeddableContainerPublicPlugin implements Plugin<any, any, SetupDependencies, StartDependencies> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: SetupDependencies) {
    const expandPanelAction = new ExpandPanelAction();
    embeddable.registerAction(expandPanelAction);
    embeddable.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction.id);
  }

  public start({ application }: CoreStart, { embeddable }: StartDependencies) {
    const dashboardOptions = {
      capabilities: application.capabilities.dashboard as unknown as DashboardCapabilities,
      getFactory: embeddable.getEmbeddableFactory,
    };
    const factory = new DashboardContainerFactory(dashboardOptions);
    embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  public stop() {}
}
