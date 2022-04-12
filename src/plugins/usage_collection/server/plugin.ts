/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from 'src/core/server';
import type { ConfigType } from './config';
import { CollectorSet } from './collector';
import type { Collector, CollectorOptions, UsageCollectorOptions } from './collector';
import { setupRoutes } from './routes';

import { UsageCountersService } from './usage_counters';
import type { UsageCounter } from './usage_counters';

/** Server's setup APIs exposed by the UsageCollection Service **/
export interface UsageCollectionSetup {
  /**
   * Creates and registers a usage counter to collect daily aggregated plugin counter events
   */
  createUsageCounter: (type: string) => UsageCounter;
  /**
   * Returns a usage counter by type
   */
  getUsageCounterByType: (type: string) => UsageCounter | undefined;
  /**
   * Creates a usage collector to collect plugin telemetry data.
   * registerCollector must be called to connect the created collector with the service.
   */
  makeUsageCollector: <TFetchReturn, ExtraOptions extends object = {}>(
    options: UsageCollectorOptions<TFetchReturn, ExtraOptions>
  ) => Collector<TFetchReturn, ExtraOptions>;
  /**
   * Register a usage collector or a stats collector.
   * Used to connect the created collector to telemetry.
   */
  registerCollector: <TFetchReturn, ExtraOptions extends object>(
    collector: Collector<TFetchReturn, ExtraOptions>
  ) => void;
  /**
   * Returns a usage collector by type
   */
  getCollectorByType: <TFetchReturn, ExtraOptions extends object>(
    type: string
  ) => Collector<TFetchReturn, ExtraOptions> | undefined;
  /**
   * Fetches the collection from all the registered collectors
   * @internal: telemetry use
   */
  bulkFetch: <TFetchReturn, ExtraOptions extends object>(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    collectors?: Map<string, Collector<TFetchReturn, ExtraOptions>>
  ) => Promise<Array<{ type: string; result: unknown }>>;
  /**
   * Converts an array of fetched stats results into key/object
   * @internal: telemetry use
   */
  toObject: <Result extends Record<string, unknown>, T = unknown>(
    statsData?: Array<{ type: string; result: T }>
  ) => Result;
  /**
   * Rename fields to use API conventions
   * @internal: monitoring use
   */
  toApiFieldNames: (
    apiData: Record<string, unknown> | unknown[]
  ) => Record<string, unknown> | unknown[];
  /**
   * Creates a stats collector to collect plugin telemetry data.
   * registerCollector must be called to connect the created collector with the service.
   * @internal: telemetry and monitoring use
   */
  makeStatsCollector: <TFetchReturn, ExtraOptions extends object = {}>(
    options: CollectorOptions<TFetchReturn, ExtraOptions>
  ) => Collector<TFetchReturn, ExtraOptions>;
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
    const kibanaIndex = core.savedObjects.getKibanaIndex();

    const collectorSet = new CollectorSet({
      logger: this.logger.get('usage-collection', 'collector-set'),
      executionContext: core.executionContext,
      maximumWaitTimeForAllCollectorsInS: config.maximumWaitTimeForAllCollectorsInS,
    });

    this.usageCountersService = new UsageCountersService({
      logger: this.logger.get('usage-collection', 'usage-counters-service'),
      retryCount: config.usageCounters.retryCount,
      bufferDurationMs: config.usageCounters.bufferDuration.asMilliseconds(),
    });

    const { createUsageCounter, getUsageCounterByType } = this.usageCountersService.setup(core);

    const uiCountersUsageCounter = createUsageCounter('uiCounter');
    const router = core.http.createRouter();
    setupRoutes({
      router,
      uiCountersUsageCounter,
      getSavedObjects: () => this.savedObjects,
      collectorSet,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      metrics: core.metrics,
      overallStatus$: core.status.overall$,
    });

    return {
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
