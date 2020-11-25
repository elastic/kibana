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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { createDashboardSavedObjectType } from './saved_objects';
import { capabilitiesProvider } from './capabilities_provider';

import { DashboardPluginSetup, DashboardPluginStart } from './types';
import { EmbeddableSetup } from '../../embeddable/server';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SetupDeps) {
    this.logger.debug('dashboard: Setup');

    core.savedObjects.registerType(
      createDashboardSavedObjectType({
        migrationDeps: {
          embeddable: plugins.embeddable,
        },
      })
    );
    core.capabilities.registerProvider(capabilitiesProvider);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('dashboard: Started');
    return {};
  }

  public stop() {}
}
