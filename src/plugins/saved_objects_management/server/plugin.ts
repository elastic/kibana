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

import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart } from './types';
import { SavedObjectsManagement } from './services';
import { registerRoutes } from './routes';
import { capabilitiesProvider } from './capabilities_provider';

export class SavedObjectsManagementPlugin
  implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, {}, {}> {
  private readonly logger: Logger;
  private managementService$ = new Subject<SavedObjectsManagement>();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public async setup({ http, capabilities }: CoreSetup) {
    this.logger.debug('Setting up SavedObjectsManagement plugin');
    registerRoutes({
      http,
      managementServicePromise: this.managementService$.pipe(first()).toPromise(),
    });

    capabilities.registerProvider(capabilitiesProvider);

    return {};
  }

  public async start(core: CoreStart) {
    this.logger.debug('Starting up SavedObjectsManagement plugin');
    const managementService = new SavedObjectsManagement(core.savedObjects.getTypeRegistry());
    this.managementService$.next(managementService);

    return {};
  }
}
