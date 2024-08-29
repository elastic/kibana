/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import { ReplaySubject, Subject, type Subscription } from 'rxjs';
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
} from '@kbn/core/server';
import { SavedObjectsClient, EventLoopDelaysMonitor } from '@kbn/core/server';
import { registerEbtCounters } from './ebt_counters';
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
  registerConfigUsageCollector,
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
  private subscriptions: Subscription[];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.metric$ = new Subject<OpsMetrics>();
    this.pluginStop$ = new ReplaySubject(1);
    this.instanceUuid = initializerContext.env.instanceUuid;
    this.subscriptions = [];
  }

  public setup(coreSetup: CoreSetup, { usageCollection }: KibanaUsageCollectionPluginsDepsSetup) {
    registerEbtCounters(coreSetup.analytics, usageCollection);
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
    this.subscriptions.push(core.metrics.getOpsMetrics$().subscribe(this.metric$));
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
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private registerUsageCollectors(
    usageCollection: UsageCollectionSetup,
    coreSetup: CoreSetup,
    metric$: Subject<OpsMetrics>,
    pluginStop$: Subject<void>,
    registerType: SavedObjectsRegisterType
  ) {
    const getSavedObjectsClient = () => this.savedObjectsClient;
    const getUiSettingsClient = () => this.uiSettingsClient;
    const getCoreUsageDataService = () => this.coreUsageData!;

    registerUiCountersUsageCollector(usageCollection, this.logger);

    registerUsageCountersUsageCollector(usageCollection, this.logger);

    registerOpsStatsCollector(usageCollection, metric$);

    const getIndicesForTypes = (types: string[]) =>
      coreSetup
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.getIndicesForTypes(types));
    registerKibanaUsageCollector(usageCollection, getIndicesForTypes);

    const coreStartPromise = coreSetup.getStartServices().then(([coreStart]) => coreStart);
    const getAllSavedObjectTypes = async () => {
      const coreStart = await coreStartPromise;
      return coreStart.savedObjects
        .getTypeRegistry()
        .getAllTypes()
        .map(({ name }) => name);
    };

    const getSoClientWithHiddenIndices = async () => {
      const coreStart = await coreStartPromise;

      const allSoTypes = await getAllSavedObjectTypes();
      return coreStart.savedObjects.createInternalRepository(allSoTypes);
    };

    registerSavedObjectsCountUsageCollector(
      usageCollection,
      getAllSavedObjectTypes,
      getSoClientWithHiddenIndices
    );
    registerManagementUsageCollector(usageCollection, getUiSettingsClient);
    registerUiMetricUsageCollector(usageCollection, registerType, getSavedObjectsClient);
    registerApplicationUsageCollector(
      this.logger.get('application-usage'),
      usageCollection,
      registerType,
      getSavedObjectsClient,
      pluginStop$
    );
    registerCloudProviderUsageCollector(usageCollection, pluginStop$);
    registerCspCollector(usageCollection, coreSetup.http);
    registerCoreUsageCollector(usageCollection, getCoreUsageDataService);
    registerConfigUsageCollector(usageCollection, getCoreUsageDataService);
    registerLocalizationUsageCollector(usageCollection, coreSetup.i18n);
    registerEventLoopDelaysCollector(
      this.logger.get('event-loop-delays'),
      usageCollection,
      registerType,
      getSavedObjectsClient,
      pluginStop$
    );
  }
}
