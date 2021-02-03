/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  registerLocalizationUsageCollector,
  registerUiCountersUsageCollector,
  registerUiCounterSavedObjectType,
  registerUiCountersRollups,
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
    this.registerUsageCollectors(
      usageCollection,
      coreSetup,
      this.metric$,
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

    registerUiCounterSavedObjectType(coreSetup.savedObjects);
    registerUiCountersRollups(this.logger.get('ui-counters'), getSavedObjectsClient);
    registerUiCountersUsageCollector(usageCollection);

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
    registerLocalizationUsageCollector(usageCollection, coreSetup.i18n);
  }
}
