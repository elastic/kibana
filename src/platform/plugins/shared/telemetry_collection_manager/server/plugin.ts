/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IClusterClient,
  SavedObjectsServiceStart,
  ElasticsearchClient,
  SavedObjectsClientContract,
  CoreStatus,
} from '@kbn/core/server';

import { firstValueFrom, ReplaySubject } from 'rxjs';
import apm from 'elastic-apm-node';
import type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
  BasicStatsPayload,
  CollectionStrategyConfig,
  CollectionStrategy,
  StatsGetterConfig,
  StatsCollectionConfig,
  UsageStatsPayload,
  OptInStatsPayload,
  StatsCollectionContext,
  UnencryptedStatsGetterConfig,
  EncryptedStatsGetterConfig,
  ClusterDetails,
} from './types';
import { encryptTelemetry } from './encryption';
import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';
import { CacheManager } from './cache';
import { CACHE_DURATION_MS } from '../common';

interface TelemetryCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

export class TelemetryCollectionManagerPlugin
  implements Plugin<TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart>
{
  private readonly logger: Logger;
  private collectionStrategy: CollectionStrategy | undefined;
  private usageGetterMethodPriority = -1;
  private coreStatus$ = new ReplaySubject<CoreStatus>(1);
  private usageCollection?: UsageCollectionSetup;
  private elasticsearchClient?: IClusterClient;
  private savedObjectsService?: SavedObjectsServiceStart;
  private readonly isDistributable: boolean;
  private readonly version: string;
  private cacheManager = new CacheManager({ cacheDurationMs: CACHE_DURATION_MS });

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDistributable = initializerContext.env.packageInfo.dist;
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, { usageCollection }: TelemetryCollectionPluginsDepsSetup) {
    this.usageCollection = usageCollection;

    core.status.core$.subscribe(this.coreStatus$);

    return {
      setCollectionStrategy: this.setCollectionStrategy.bind(this),
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
      shouldGetTelemetry: this.shouldGetTelemetry.bind(this),
    };
  }

  public start(core: CoreStart) {
    this.elasticsearchClient = core.elasticsearch.client;
    this.savedObjectsService = core.savedObjects;

    return {
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
      shouldGetTelemetry: this.shouldGetTelemetry.bind(this),
    };
  }

  public stop() {
    this.coreStatus$.complete();
  }

  /**
   * Checks if Kibana is in a healthy state to attempt the Telemetry report generation:
   * - Elasticsearch is active.
   * - SavedObjects client is active.
   * @private
   */
  private async shouldGetTelemetry() {
    const { elasticsearch, savedObjects } = await firstValueFrom(this.coreStatus$);
    return (
      elasticsearch.level.toString() === 'available' &&
      savedObjects.level.toString() === 'available'
    );
  }

  private setCollectionStrategy<T extends BasicStatsPayload>(
    collectionConfig: CollectionStrategyConfig<T>
  ) {
    const { title, priority, statsGetter, clusterDetailsGetter } = collectionConfig;

    if (typeof priority !== 'number') {
      throw new Error('priority must be set.');
    }
    if (priority === this.usageGetterMethodPriority) {
      throw new Error(`A Usage Getter with the same priority is already set.`);
    }

    if (priority > this.usageGetterMethodPriority) {
      if (!statsGetter) {
        throw Error('Stats getter method not set.');
      }
      if (!clusterDetailsGetter) {
        throw Error('Cluster UUIds method is not set.');
      }

      this.logger.debug(`Setting ${title} as the telemetry collection strategy`);

      // Overwrite the collection strategy
      this.collectionStrategy = collectionConfig;
      this.usageGetterMethodPriority = priority;
    }
  }

  /**
   * Returns the context to provide to the Collection Strategies.
   * It may return undefined if the ES and SO clients are not initialised yet.
   * @param config {@link StatsGetterConfig}
   * @param usageCollection {@link UsageCollectionSetup}
   * @private
   */
  private getStatsCollectionConfig(
    config: StatsGetterConfig,
    usageCollection: UsageCollectionSetup
  ): StatsCollectionConfig | undefined {
    const esClient = this.getElasticsearchClient(config);
    const soClient = this.getSavedObjectsClient(config);
    // Provide the kibanaRequest so opted-in plugins can scope their custom clients only if the request is not encrypted
    const refreshCache = config.unencrypted ? true : !!config.refreshCache;

    if (esClient && soClient) {
      return { usageCollection, esClient, soClient, refreshCache };
    }
  }

  /**
   * Returns the ES client scoped to the requester or Kibana's internal user
   * depending on whether the request is encrypted or not:
   * If the request is unencrypted, we intentionally scope the results to "what the user can see".
   * @param config {@link StatsGetterConfig}
   * @private
   */
  private getElasticsearchClient(config: StatsGetterConfig): ElasticsearchClient | undefined {
    return this.elasticsearchClient?.asInternalUser;
  }

  /**
   * Returns the SavedObjects client scoped to the requester or Kibana's internal user
   * depending on whether the request is encrypted or not:
   * If the request is unencrypted, we intentionally scope the results to "what the user can see"
   * @param config {@link StatsGetterConfig}
   * @private
   */
  private getSavedObjectsClient(config: StatsGetterConfig): SavedObjectsClientContract | undefined {
    if (this.savedObjectsService) {
      // Wrapping the internalRepository with the `TelemetrySavedObjectsClient`
      // to ensure some best practices when collecting "all the telemetry"
      // (i.e.: `.find` requests should query all spaces)
      return new TelemetrySavedObjectsClient(this.savedObjectsService.createInternalRepository());
    }
  }

  private async getOptInStats(
    optInStatus: boolean,
    config: UnencryptedStatsGetterConfig
  ): Promise<Array<{ clusterUuid: string; stats: OptInStatsPayload }>>;
  private async getOptInStats(
    optInStatus: boolean,
    config: EncryptedStatsGetterConfig
  ): Promise<Array<{ clusterUuid: string; stats: string }>>;
  private async getOptInStats(optInStatus: boolean, config: StatsGetterConfig) {
    if (!this.usageCollection) {
      return [];
    }

    const collection = this.collectionStrategy;
    if (collection) {
      // Build the context (clients and others) to send to the CollectionStrategies
      const statsCollectionConfig = this.getStatsCollectionConfig(config, this.usageCollection);
      if (statsCollectionConfig) {
        try {
          const optInStats = await this.getOptInStatsForCollection(
            collection,
            optInStatus,
            statsCollectionConfig
          );

          this.logger.debug(`Received Opt In stats using ${collection.title} collection.`);

          return await Promise.all(
            optInStats.map(async (clusterStats) => {
              const clusterUuid = clusterStats.cluster_uuid;

              return {
                clusterUuid,
                stats: config.unencrypted
                  ? clusterStats
                  : await encryptTelemetry(clusterStats, {
                      useProdKey: this.isDistributable,
                    }),
              };
            })
          );
        } catch (err) {
          this.logger.debug(
            `Failed to collect any opt in stats with collection ${collection.title}.`
          );
        }
      }
    }

    return [];
  }

  private getOptInStatsForCollection = async (
    collection: CollectionStrategy,
    optInStatus: boolean,
    statsCollectionConfig: StatsCollectionConfig
  ): Promise<OptInStatsPayload[]> => {
    const context: StatsCollectionContext = {
      logger: this.logger.get(collection.title),
      version: this.version,
    };

    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig, context);
    return clustersDetails.map(({ clusterUuid }) => ({
      cluster_uuid: clusterUuid,
      opt_in_status: optInStatus,
    }));
  };

  private async getStats(
    config: UnencryptedStatsGetterConfig
  ): Promise<Array<{ clusterUuid: string; stats: UsageStatsPayload }>>;
  private async getStats(
    config: EncryptedStatsGetterConfig
  ): Promise<Array<{ clusterUuid: string; stats: string }>>;
  private async getStats(config: StatsGetterConfig) {
    const retrieveSnapshotTelemetryTransaction = apm.startTransaction(
      'Retrieve Snapshot Telemetry',
      'telemetry'
    );
    retrieveSnapshotTelemetryTransaction.addLabels({
      unencrypted: config.unencrypted,
      refresh: config.refreshCache,
    });
    if (!this.usageCollection) {
      retrieveSnapshotTelemetryTransaction.end('skipped');
      return [];
    }
    const collection = this.collectionStrategy;
    if (collection) {
      // Build the context (clients and others) to send to the CollectionStrategies
      const statsCollectionConfig = this.getStatsCollectionConfig(config, this.usageCollection);
      if (statsCollectionConfig) {
        try {
          retrieveSnapshotTelemetryTransaction.startSpan('Fetch usage');
          const usageData = await this.getUsageForCollection(collection, statsCollectionConfig);
          this.logger.debug(`Received Usage using ${collection.title} collection.`);

          retrieveSnapshotTelemetryTransaction.startSpan('Prepare response');
          const results = await Promise.all(
            usageData.map(async (clusterStats) => {
              const { cluster_uuid: clusterUuid } = clusterStats;

              return {
                clusterUuid,
                stats: config.unencrypted
                  ? clusterStats
                  : await encryptTelemetry(clusterStats, {
                      useProdKey: this.isDistributable,
                    }),
              };
            })
          );
          retrieveSnapshotTelemetryTransaction.end('success');
          return results;
        } catch (err) {
          this.logger.debug(
            `Failed to collect any usage with registered collection ${collection.title}.`
          );
          retrieveSnapshotTelemetryTransaction.end('error');
          return [];
        }
      }
    }

    retrieveSnapshotTelemetryTransaction.end('skipped');

    return [];
  }

  private createCacheKey(collectionSource: string, clustersDetails: ClusterDetails[]) {
    const clusterUUids = clustersDetails
      .map(({ clusterUuid }) => clusterUuid)
      .sort()
      .join('_');

    return `${collectionSource}::${clusterUUids}`;
  }

  private updateFetchedAt(statsPayload: UsageStatsPayload[]): UsageStatsPayload[] {
    return statsPayload.map((stat) => ({
      ...stat,
      cacheDetails: {
        ...stat.cacheDetails,
        fetchedAt: new Date().toISOString(),
      },
    }));
  }

  private async getUsageForCollection(
    collection: CollectionStrategy,
    statsCollectionConfig: StatsCollectionConfig
  ): Promise<UsageStatsPayload[]> {
    const context: StatsCollectionContext = {
      logger: this.logger.get(collection.title),
      version: this.version,
    };
    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig, context);
    const { refreshCache } = statsCollectionConfig;
    const { title: collectionSource } = collection;

    // on `refreshCache: true` clear all cache to store a fresh copy
    if (refreshCache) {
      this.cacheManager.resetCache();
    }

    if (clustersDetails.length === 0) {
      return [];
    }

    const cacheKey = this.createCacheKey(collectionSource, clustersDetails);
    const cachedUsageStatsPromise =
      this.cacheManager.getFromCache<Promise<UsageStatsPayload[]>>(cacheKey);
    if (cachedUsageStatsPromise) {
      return this.updateFetchedAt(await cachedUsageStatsPromise);
    }

    const statsFromCollectionPromise = this.getStatsFromCollection(
      clustersDetails,
      collection,
      statsCollectionConfig
    );
    this.cacheManager.setCache(cacheKey, statsFromCollectionPromise);

    try {
      const stats = await statsFromCollectionPromise;
      return this.updateFetchedAt(stats);
    } catch (err) {
      this.logger.debug(
        `Failed to generate the telemetry report (${err.message}). Resetting the cache...`
      );
      this.cacheManager.resetCache();
      throw err;
    }
  }

  private async getStatsFromCollection(
    clustersDetails: ClusterDetails[],
    collection: CollectionStrategy,
    statsCollectionConfig: StatsCollectionConfig
  ) {
    const context: StatsCollectionContext = {
      logger: this.logger.get(collection.title),
      version: this.version,
    };
    const { title: collectionSource } = collection;
    const now = new Date().toISOString();
    const stats = await collection.statsGetter(clustersDetails, statsCollectionConfig, context);
    return stats.map((stat) => ({
      collectionSource,
      cacheDetails: { updatedAt: now, fetchedAt: now },
      ...stat,
    }));
  }
}
