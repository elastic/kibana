/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
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
} from 'src/core/server';

import type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
  BasicStatsPayload,
  CollectionStrategyConfig,
  CollectionStrategy,
  StatsGetterConfig,
  StatsCollectionConfig,
  UsageStatsPayload,
  StatsCollectionContext,
  UnencryptedStatsGetterConfig,
  EncryptedStatsGetterConfig,
} from './types';
import { encryptTelemetry } from './encryption';
import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';

interface TelemetryCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

export class TelemetryCollectionManagerPlugin
  implements Plugin<TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart> {
  private readonly logger: Logger;
  private collectionStrategy: CollectionStrategy | undefined;
  private usageGetterMethodPriority = -1;
  private usageCollection?: UsageCollectionSetup;
  private elasticsearchClient?: IClusterClient;
  private savedObjectsService?: SavedObjectsServiceStart;
  private readonly isDistributable: boolean;
  private readonly version: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDistributable = initializerContext.env.packageInfo.dist;
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, { usageCollection }: TelemetryCollectionPluginsDepsSetup) {
    this.usageCollection = usageCollection;

    return {
      setCollectionStrategy: this.setCollectionStrategy.bind(this),
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
      areAllCollectorsReady: this.areAllCollectorsReady.bind(this),
    };
  }

  public start(core: CoreStart) {
    this.elasticsearchClient = core.elasticsearch.client;
    this.savedObjectsService = core.savedObjects;

    return {
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
      areAllCollectorsReady: this.areAllCollectorsReady.bind(this),
    };
  }

  public stop() {}

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
    const kibanaRequest = config.unencrypted ? config.request : void 0;

    if (esClient && soClient) {
      return { usageCollection, esClient, soClient, kibanaRequest };
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
    return config.unencrypted
      ? this.elasticsearchClient?.asScoped(config.request).asCurrentUser
      : this.elasticsearchClient?.asInternalUser;
  }

  /**
   * Returns the SavedObjects client scoped to the requester or Kibana's internal user
   * depending on whether the request is encrypted or not:
   * If the request is unencrypted, we intentionally scope the results to "what the user can see"
   * @param config {@link StatsGetterConfig}
   * @private
   */
  private getSavedObjectsClient(config: StatsGetterConfig): SavedObjectsClientContract | undefined {
    if (config.unencrypted) {
      // Intentionally using the scoped client here to make use of all the security wrappers.
      // It also returns spaces-scoped telemetry.
      return this.savedObjectsService?.getScopedClient(config.request);
    } else if (this.savedObjectsService) {
      // Wrapping the internalRepository with the `TelemetrySavedObjectsClient`
      // to ensure some best practices when collecting "all the telemetry"
      // (i.e.: `.find` requests should query all spaces)
      return new TelemetrySavedObjectsClient(this.savedObjectsService.createInternalRepository());
    }
  }

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
          if (optInStats && optInStats.length) {
            this.logger.debug(`Got Opt In stats using ${collection.title} collection.`);
            if (config.unencrypted) {
              return optInStats;
            }
            return encryptTelemetry(optInStats, { useProdKey: this.isDistributable });
          }
        } catch (err) {
          this.logger.debug(
            `Failed to collect any opt in stats with collection ${collection.title}.`
          );
        }
      }
    }

    return [];
  }

  private async areAllCollectorsReady() {
    return await this.usageCollection?.areAllCollectorsReady();
  }

  private getOptInStatsForCollection = async (
    collection: CollectionStrategy,
    optInStatus: boolean,
    statsCollectionConfig: StatsCollectionConfig
  ) => {
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

  private async getStats(config: UnencryptedStatsGetterConfig): Promise<UsageStatsPayload[]>;
  private async getStats(config: EncryptedStatsGetterConfig): Promise<string[]>;
  private async getStats(config: StatsGetterConfig) {
    if (!this.usageCollection) {
      return [];
    }
    const collection = this.collectionStrategy;
    if (collection) {
      // Build the context (clients and others) to send to the CollectionStrategies
      const statsCollectionConfig = this.getStatsCollectionConfig(config, this.usageCollection);
      if (statsCollectionConfig) {
        try {
          const usageData = await this.getUsageForCollection(collection, statsCollectionConfig);
          if (usageData.length) {
            this.logger.debug(`Got Usage using ${collection.title} collection.`);
            if (config.unencrypted) {
              return usageData;
            }

            return await encryptTelemetry(usageData, {
              useProdKey: this.isDistributable,
            });
          }
        } catch (err) {
          this.logger.debug(
            `Failed to collect any usage with registered collection ${collection.title}.`
          );
        }
      }
    }

    return [];
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

    if (clustersDetails.length === 0) {
      // don't bother doing a further lookup.
      return [];
    }

    const stats = await collection.statsGetter(clustersDetails, statsCollectionConfig, context);

    // Add the `collectionSource` to the resulting payload
    return stats.map((stat) => ({ collectionSource: collection.title, ...stat }));
  }
}
