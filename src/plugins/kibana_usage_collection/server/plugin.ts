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
import { Subject, Observable } from 'rxjs';
import {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  ISavedObjectsRepository,
  IUiSettingsClient,
  SharedGlobalConfig,
  SavedObjectsClient,
  CoreStart,
  SavedObjectsServiceSetup,
  OpsMetrics,
  Logger,
  CoreUsageDataStart,
} from '../../../core/server';
import {
  registerApplicationUsageCollector,
  registerKibanaUsageCollector,
  registerManagementUsageCollector,
  registerOpsStatsCollector,
  registerUiMetricUsageCollector,
  registerCspCollector,
  registerCoreUsageCollector,
} from './collectors';

interface KibanaUsageCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

type SavedObjectsRegisterType = SavedObjectsServiceSetup['registerType'];

export class KibanaUsageCollectionPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly legacyConfig$: Observable<SharedGlobalConfig>;
  private savedObjectsClient?: ISavedObjectsRepository;
  private uiSettingsClient?: IUiSettingsClient;
  private metric$: Subject<OpsMetrics>;
  private coreUsageData?: CoreUsageDataStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.legacyConfig$ = initializerContext.config.legacy.globalConfig$;
    this.metric$ = new Subject<OpsMetrics>();
  }

  public setup(coreSetup: CoreSetup, { usageCollection }: KibanaUsageCollectionPluginsDepsSetup) {
    this.registerUsageCollectors(usageCollection, coreSetup, this.metric$, (opts) =>
      coreSetup.savedObjects.registerType(opts)
    );
  }

  public start(core: CoreStart) {
    const { savedObjects, uiSettings } = core;
    this.savedObjectsClient = savedObjects.createInternalRepository();
    const savedObjectsClient = new SavedObjectsClient(this.savedObjectsClient);
    this.uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
    core.metrics.getOpsMetrics$().subscribe(this.metric$);
    this.coreUsageData = core.coreUsageData;
  }

  public stop() {
    this.metric$.complete();
  }

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    coreSetup: CoreSetup,
    metric$: Subject<OpsMetrics>,
    registerType: SavedObjectsRegisterType
  ) {
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;
    const getCoreUsageDataService = () => this.coreUsageData!;

    registerOpsStatsCollector(usageCollection, metric$);
    registerKibanaUsageCollector(usageCollection, this.legacyConfig$);
    registerManagementUsageCollector(usageCollection, getUiSettingsClient);
    registerUiMetricUsageCollector(usageCollection, registerType, getSavedObjectsClient);
    registerApplicationUsageCollector(
      this.logger.get('application-usage'),
      usageCollection,
      registerType,
      getSavedObjectsClient
    );
    registerCspCollector(usageCollection, coreSetup.http);
    registerCoreUsageCollector(usageCollection, getCoreUsageDataService);
  }
}
