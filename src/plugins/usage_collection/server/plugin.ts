/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
} from 'src/core/server';
import { ConfigType } from './config';
import { CollectorSet } from './collector';
import { setupRoutes } from './routes';

import { UsageCountersService } from './usage_counters';
import type { UsageCountersServiceSetup } from './usage_counters';

export interface UsageCollectionSetup {
  /**
   * Creates and registers a usage counter to collect daily aggregated plugin counter events
   */
  createUsageCounter: UsageCountersServiceSetup['createUsageCounter'];
  /**
   * Returns a usage counter by type
   */
  getUsageCounterByType: UsageCountersServiceSetup['getUsageCounterByType'];
  /**
   * Creates a usage collector to collect plugin telemetry data.
   * registerCollector must be called to connect the created collecter with the service.
   */
  makeUsageCollector: CollectorSet['makeUsageCollector'];
  /**
   * Register a usage collector or a stats collector.
   * Used to connect the created collector to telemetry.
   */
  registerCollector: CollectorSet['registerCollector'];
  /**
   * Returns a usage collector by type
   */
  getCollectorByType: CollectorSet['getCollectorByType'];
  /* internal: telemetry use */
  areAllCollectorsReady: CollectorSet['areAllCollectorsReady'];
  /* internal: telemetry use */
  bulkFetch: CollectorSet['bulkFetch'];
  /* internal: telemetry use */
  toObject: CollectorSet['toObject'];
  /* internal: monitoring use */
  toApiFieldNames: CollectorSet['toApiFieldNames'];
  /* internal: telemtery and monitoring use */
  makeStatsCollector: CollectorSet['makeStatsCollector'];
}

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup> {
  private readonly logger: Logger;
  private savedObjects?: ISavedObjectsRepository;
  private usageCountersService?: UsageCountersService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup): UsageCollectionSetup {
    const config = this.initializerContext.config.get<ConfigType>();

    const collectorSet = new CollectorSet({
      logger: this.logger.get('usage-collection', 'collector-set'),
      maximumWaitTimeForAllCollectorsInS: config.maximumWaitTimeForAllCollectorsInS,
    });

    this.usageCountersService = new UsageCountersService({
      logger: this.logger.get('usage-collection', 'usage-counters-service'),
      retryCount: config.usageCounters.retryCount,
      bufferDurationMs: config.usageCounters.bufferDuration.asMilliseconds(),
    });

    const { createUsageCounter, getUsageCounterByType } = this.usageCountersService.setup(core);

    const uiCountersUsageCounter = createUsageCounter('uiCounter');
    const globalConfig = this.initializerContext.config.legacy.get();
    const router = core.http.createRouter();
    setupRoutes({
      router,
      uiCountersUsageCounter,
      getSavedObjects: () => this.savedObjects,
      collectorSet,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex: globalConfig.kibana.index,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      metrics: core.metrics,
      overallStatus$: core.status.overall$,
    });

    return {
      areAllCollectorsReady: collectorSet.areAllCollectorsReady,
      bulkFetch: collectorSet.bulkFetch,
      getCollectorByType: collectorSet.getCollectorByType,
      makeStatsCollector: collectorSet.makeStatsCollector,
      makeUsageCollector: collectorSet.makeUsageCollector,
      registerCollector: collectorSet.registerCollector,
      toApiFieldNames: collectorSet.toApiFieldNames,
      toObject: collectorSet.toObject,
      createUsageCounter,
      getUsageCounterByType,
    };
  }

  public start({ savedObjects }: CoreStart) {
    this.logger.debug('Starting plugin');
    const config = this.initializerContext.config.get<ConfigType>();
    if (!this.usageCountersService) {
      throw new Error('plugin setup must be called first.');
    }

    this.savedObjects = savedObjects.createInternalRepository();
    if (config.usageCounters.enabled) {
      this.usageCountersService.start({ savedObjects });
    } else {
      // call stop() to complete observers.
      this.usageCountersService.stop();
    }
  }

  public stop() {
    this.logger.debug('Stopping plugin');
    this.usageCountersService?.stop();
  }
}
