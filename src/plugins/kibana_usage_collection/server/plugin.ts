/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Subject, Observable } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  ISavedObjectsRepository,
  IUiSettingsClient,
  SharedGlobalConfig,
  CoreStart,
  SavedObjectsServiceSetup,
  OpsMetrics,
  Logger,
  CoreUsageDataStart,
} from 'src/core/server';
import { SavedObjectsClient } from '../../../core/server';
import {
  registerApplicationUsageCollector,
  registerKibanaUsageCollector,
  registerManagementUsageCollector,
  registerOpsStatsCollector,
  registerUiMetricUsageCollector,
  registerCloudProviderUsageCollector,
  registerCspCollector,
  registerCoreUsageCollector,
  registerLocalizationUsageCollector,
  registerUiCountersUsageCollector,
  registerUiCounterSavedObjectType,
  registerUiCountersRollups,
  registerConfigUsageCollector,
  registerUsageCountersRollups,
  registerUsageCountersUsageCollector,
  registerSavedObjectsCountUsageCollector,
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
  private stopUsingUiCounterIndicies$: Subject<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.legacyConfig$ = initializerContext.config.legacy.globalConfig$;
    this.metric$ = new Subject<OpsMetrics>();
    this.stopUsingUiCounterIndicies$ = new Subject();
  }

  public setup(coreSetup: CoreSetup, { usageCollection }: KibanaUsageCollectionPluginsDepsSetup) {
    usageCollection.createUsageCounter('uiCounters');

    this.registerUsageCollectors(
      usageCollection,
      coreSetup,
      this.metric$,
      this.stopUsingUiCounterIndicies$,
      coreSetup.savedObjects.registerType.bind(coreSetup.savedObjects)
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
    this.stopUsingUiCounterIndicies$.complete();
  }

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    coreSetup: CoreSetup,
    metric$: Subject<OpsMetrics>,
    stopUsingUiCounterIndicies$: Subject<void>,
    registerType: SavedObjectsRegisterType
  ) {
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;
    const getCoreUsageDataService = () => this.coreUsageData!;

    registerUiCounterSavedObjectType(coreSetup.savedObjects);
    registerUiCountersRollups(
      this.logger.get('ui-counters'),
      stopUsingUiCounterIndicies$,
      getSavedObjectsClient
    );
    registerUiCountersUsageCollector(usageCollection, stopUsingUiCounterIndicies$);

    registerUsageCountersRollups(this.logger.get('usage-counters-rollup'), getSavedObjectsClient);
    registerUsageCountersUsageCollector(usageCollection);

    registerOpsStatsCollector(usageCollection, metric$);
    registerKibanaUsageCollector(usageCollection, this.legacyConfig$);
    registerSavedObjectsCountUsageCollector(usageCollection, this.legacyConfig$);
    registerManagementUsageCollector(usageCollection, getUiSettingsClient);
    registerUiMetricUsageCollector(usageCollection, registerType, getSavedObjectsClient);
    registerApplicationUsageCollector(
      this.logger.get('application-usage'),
      usageCollection,
      registerType,
      getSavedObjectsClient
    );
    registerCloudProviderUsageCollector(usageCollection);
    registerCspCollector(usageCollection, coreSetup.http);
    registerCoreUsageCollector(usageCollection, getCoreUsageDataService);
    registerConfigUsageCollector(usageCollection, getCoreUsageDataService);
    registerLocalizationUsageCollector(usageCollection, coreSetup.i18n);
  }
}
