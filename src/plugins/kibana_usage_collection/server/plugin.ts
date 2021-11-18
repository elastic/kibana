/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup, UsageCounter } from 'src/plugins/usage_collection/server';
import { Subject } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  ISavedObjectsRepository,
  IUiSettingsClient,
  CoreStart,
  SavedObjectsServiceSetup,
  OpsMetrics,
  Logger,
  CoreUsageDataStart,
} from 'src/core/server';
import { SavedObjectsClient, EventLoopDelaysMonitor } from '../../../core/server';
import {
  startTrackingEventLoopDelaysUsage,
  startTrackingEventLoopDelaysThreshold,
  SAVED_OBJECTS_DAILY_TYPE,
} from './collectors/event_loop_delays';
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
  registerEventLoopDelaysCollector,
} from './collectors';

interface KibanaUsageCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

type SavedObjectsRegisterType = SavedObjectsServiceSetup['registerType'];

export class KibanaUsageCollectionPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly instanceUuid: string;
  private savedObjectsClient?: ISavedObjectsRepository;
  private uiSettingsClient?: IUiSettingsClient;
  private metric$: Subject<OpsMetrics>;
  private coreUsageData?: CoreUsageDataStart;
  private eventLoopUsageCounter?: UsageCounter;
  private pluginStop$: Subject<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.metric$ = new Subject<OpsMetrics>();
    this.pluginStop$ = new Subject();
    this.instanceUuid = initializerContext.env.instanceUuid;
  }

  public setup(coreSetup: CoreSetup, { usageCollection }: KibanaUsageCollectionPluginsDepsSetup) {
    usageCollection.createUsageCounter('uiCounters');
    this.eventLoopUsageCounter = usageCollection.createUsageCounter('eventLoop');
    coreSetup.coreUsageData.registerUsageCounter(usageCollection.createUsageCounter('core'));
    this.registerUsageCollectors(
      usageCollection,
      coreSetup,
      this.metric$,
      this.pluginStop$,
      coreSetup.savedObjects.registerType.bind(coreSetup.savedObjects)
    );
  }

  public start(core: CoreStart) {
    if (!this.eventLoopUsageCounter) {
      throw new Error('#setup must be called first');
    }
    const { savedObjects, uiSettings } = core;
    this.savedObjectsClient = savedObjects.createInternalRepository([SAVED_OBJECTS_DAILY_TYPE]);
    const savedObjectsClient = new SavedObjectsClient(this.savedObjectsClient);
    this.uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
    core.metrics.getOpsMetrics$().subscribe(this.metric$);
    this.coreUsageData = core.coreUsageData;
    startTrackingEventLoopDelaysUsage(
      this.savedObjectsClient,
      this.instanceUuid,
      this.pluginStop$.asObservable(),
      new EventLoopDelaysMonitor()
    );
    startTrackingEventLoopDelaysThreshold(
      this.eventLoopUsageCounter,
      this.logger,
      this.pluginStop$.asObservable(),
      new EventLoopDelaysMonitor()
    );
  }

  public stop() {
    this.metric$.complete();

    this.pluginStop$.next();
    this.pluginStop$.complete();
  }

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    coreSetup: CoreSetup,
    metric$: Subject<OpsMetrics>,
    pluginStop$: Subject<void>,
    registerType: SavedObjectsRegisterType
  ) {
    const kibanaIndex = coreSetup.savedObjects.getKibanaIndex();
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;
    const getCoreUsageDataService = () => this.coreUsageData!;

    registerUiCounterSavedObjectType(coreSetup.savedObjects);
    registerUiCountersRollups(this.logger.get('ui-counters'), pluginStop$, getSavedObjectsClient);
    registerUiCountersUsageCollector(usageCollection, pluginStop$);

    registerUsageCountersRollups(this.logger.get('usage-counters-rollup'), getSavedObjectsClient);
    registerUsageCountersUsageCollector(usageCollection);

    registerOpsStatsCollector(usageCollection, metric$);
    registerKibanaUsageCollector(usageCollection, kibanaIndex);
    registerSavedObjectsCountUsageCollector(usageCollection, kibanaIndex);
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
    registerEventLoopDelaysCollector(
      this.logger.get('event-loop-delays'),
      usageCollection,
      registerType,
      getSavedObjectsClient
    );
  }
}
