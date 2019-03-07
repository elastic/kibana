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

// @ts-ignore
import { SavedVisualizations } from './saved_visualizations/saved_visualizations';

import { Dependencies, Management, Ui, Visualize } from '../../plugin_dependencies';

// TODO: import real type from core once available
interface CoreStart {
  [key: string]: any;
}

export interface VisualizeStartDependencies extends Dependencies {
  management: Pick<Management, 'savedObjectManagementRegistry'>;
  ui: Pick<
    Ui,
    | 'createLegacyClass'
    | 'savedObjectLoader'
    | 'savedObjectProvider'
    | 'savedObjectsClientProvider'
    | 'uiModules'
  >;
  visualize: Pick<Visualize, 'updateOldState' | 'visProvider' | 'visTypesRegistryProvider'>;
}

export class VisualizePlugin {
  private readonly savedVisualizations: SavedVisualizations;

  constructor() {
    this.savedVisualizations = new SavedVisualizations();
  }

  public start(core: CoreStart, dependencies: VisualizeStartDependencies) {
    const { management, ui, visualize } = dependencies;

    this.savedVisualizations.start({
      createLegacyClass: ui.createLegacyClass,
      SavedObjectLoader: ui.savedObjectLoader,
      savedObjectManagementRegistry: management.savedObjectManagementRegistry,
      SavedObjectProvider: ui.savedObjectProvider,
      SavedObjectsClientProvider: ui.savedObjectsClientProvider,
      uiModules: ui.uiModules,
      updateOldState: visualize.updateOldState,
      VisProvider: visualize.visProvider,
      VisTypesRegistryProvider: visualize.visTypesRegistryProvider,
    });

    return {
      // public api
    };
  }

  public stop() {
    // cleanup
  }
}
