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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { IndexPatternManagementService, IndexPatternManagementSetup } from './services';
import {
  SavedObjectsManagementService,
  SavedObjectsManagementServiceSetup,
} from './services/saved_objects_management';

export interface ManagementPluginSetupDependencies {
  home: HomePublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ManagementPluginStartDependencies {}

export interface ManagementSetup {
  indexPattern: IndexPatternManagementSetup;
  savedObjects: SavedObjectsManagementServiceSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ManagementStart {}

export class ManagementPlugin
  implements
    Plugin<
      ManagementSetup,
      ManagementStart,
      ManagementPluginSetupDependencies,
      ManagementPluginStartDependencies
    > {
  private readonly indexPattern = new IndexPatternManagementService();
  private readonly savedObjects = new SavedObjectsManagementService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home }: ManagementPluginSetupDependencies) {
    return {
      indexPattern: this.indexPattern.setup({ httpClient: core.http, home }),
      savedObjects: this.savedObjects.setup({ home }),
    };
  }

  public start(core: CoreStart, plugins: ManagementPluginStartDependencies) {
    return {};
  }

  public stop() {
    this.indexPattern.stop();
  }
}
