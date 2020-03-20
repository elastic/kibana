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
  CoreSetup,
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
} from 'src/core/server';
import { Server } from 'hapi';
import { registerRoutes } from './routes';
import { registerCollection } from './telemetry_collection';
import { UsageCollectionSetup } from '../../../../plugins/usage_collection/server';
import {
  registerUiMetricUsageCollector,
  registerTelemetryUsageCollector,
  registerLocalizationUsageCollector,
  registerTelemetryPluginUsageCollector,
  registerManagementUsageCollector,
  registerApplicationUsageCollector,
} from './collectors';

export interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
}

export class TelemetryPlugin {
  private readonly currentKibanaVersion: string;
  private savedObjectsClient?: ISavedObjectsRepository;

  constructor(initializerContext: PluginInitializerContext) {
    this.currentKibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, { usageCollection }: PluginsSetup, server: Server) {
    const currentKibanaVersion = this.currentKibanaVersion;

    registerCollection();
    registerRoutes({ core, currentKibanaVersion, server });

    const getSavedObjectsClient = () => this.savedObjectsClient;

    registerTelemetryPluginUsageCollector(usageCollection, server);
    registerLocalizationUsageCollector(usageCollection, server);
    registerTelemetryUsageCollector(usageCollection, server);
    registerUiMetricUsageCollector(usageCollection, getSavedObjectsClient);
    registerManagementUsageCollector(usageCollection, server);
    registerApplicationUsageCollector(usageCollection, getSavedObjectsClient);
  }

  public start({ savedObjects }: CoreStart) {
    this.savedObjectsClient = savedObjects.createInternalRepository();
  }
}
