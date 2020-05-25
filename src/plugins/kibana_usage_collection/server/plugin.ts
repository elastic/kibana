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

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Observable } from 'rxjs';
import {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  MetricsServiceSetup,
  ISavedObjectsRepository,
  IUiSettingsClient,
  SharedGlobalConfig,
  SavedObjectsClient,
  CoreStart,
  SavedObjectsServiceSetup,
} from '../../../core/server';
import {
  registerApplicationUsageCollector,
  registerKibanaUsageCollector,
  registerManagementUsageCollector,
  registerOpsStatsCollector,
  registerUiMetricUsageCollector,
} from './collectors';

interface KibanaUsageCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

type SavedObjectsRegisterType = SavedObjectsServiceSetup['registerType'];

export class KibanaUsageCollectionPlugin implements Plugin {
  private readonly legacyConfig$: Observable<SharedGlobalConfig>;
  private savedObjectsClient?: ISavedObjectsRepository;
  private uiSettingsClient?: IUiSettingsClient;

  constructor(initializerContext: PluginInitializerContext) {
    this.legacyConfig$ = initializerContext.config.legacy.globalConfig$;
  }

  public setup(
    { savedObjects, metrics, getStartServices }: CoreSetup,
    { usageCollection }: KibanaUsageCollectionPluginsDepsSetup
  ) {
    this.registerUsageCollectors(usageCollection, metrics, (opts) =>
      savedObjects.registerType(opts)
    );
  }

  public start(core: CoreStart) {
    const { savedObjects, uiSettings } = core;
    this.savedObjectsClient = savedObjects.createInternalRepository();
    const savedObjectsClient = new SavedObjectsClient(this.savedObjectsClient);
    this.uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
  }

  public stop() {}

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    metrics: MetricsServiceSetup,
    registerType: SavedObjectsRegisterType
  ) {
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;

    registerOpsStatsCollector(usageCollection, metrics.getOpsMetrics$());
    registerKibanaUsageCollector(usageCollection, this.legacyConfig$);
    registerManagementUsageCollector(usageCollection, getUiSettingsClient);
    registerUiMetricUsageCollector(usageCollection, registerType, getSavedObjectsClient);
    registerApplicationUsageCollector(usageCollection, registerType, getSavedObjectsClient);
  }
}
