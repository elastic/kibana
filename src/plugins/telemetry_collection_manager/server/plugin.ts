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
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
  BasicStatsPayload,
  CollectionConfig,
  Collection,
  StatsGetterConfig,
  StatsCollectionConfig,
  UsageStatsPayload,
  StatsCollectionContext,
} from './types';

import { encryptTelemetry } from './encryption';

interface TelemetryCollectionPluginsDepsSetup {
  usageCollection: UsageCollectionSetup;
}

export class TelemetryCollectionManagerPlugin
  implements Plugin<TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart> {
  private readonly logger: Logger;
  private readonly collections: Array<Collection<any>> = [];
  private usageGetterMethodPriority = -1;
  private usageCollection?: UsageCollectionSetup;
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
      setCollection: this.setCollection.bind(this),
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
    };
  }

  public start(core: CoreStart) {
    return {
      setCollection: this.setCollection.bind(this),
      getOptInStats: this.getOptInStats.bind(this),
      getStats: this.getStats.bind(this),
    };
  }

  public stop() {}

  private setCollection<CustomContext extends Record<string, any>, T extends BasicStatsPayload>(
    collectionConfig: CollectionConfig<CustomContext, T>
  ) {
    const {
      title,
      priority,
      esCluster,
      statsGetter,
      clusterDetailsGetter,
      licenseGetter,
    } = collectionConfig;

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
      if (!esCluster) {
        throw Error('esCluster name must be set for the getCluster method.');
      }
      if (!clusterDetailsGetter) {
        throw Error('Cluster UUIds method is not set.');
      }
      if (!licenseGetter) {
        throw Error('License getter method not set.');
      }

      this.collections.unshift({
        licenseGetter,
        statsGetter,
        clusterDetailsGetter,
        esCluster,
        title,
      });
      this.usageGetterMethodPriority = priority;
    }
  }

  private getStatsCollectionConfig(
    config: StatsGetterConfig,
    collection: Collection,
    usageCollection: UsageCollectionSetup
  ): StatsCollectionConfig {
    const { start, end, request } = config;

    const callCluster = config.unencrypted
      ? collection.esCluster.asScoped(request).callAsCurrentUser
      : collection.esCluster.callAsInternalUser;

    return { callCluster, start, end, usageCollection };
  }

  private async getOptInStats(optInStatus: boolean, config: StatsGetterConfig) {
    if (!this.usageCollection) {
      return [];
    }
    for (const collection of this.collections) {
      const statsCollectionConfig = this.getStatsCollectionConfig(
        config,
        collection,
        this.usageCollection
      );
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
        this.logger.debug(`Failed to collect any opt in stats with registered collections.`);
        // swallow error to try next collection;
      }
    }

    return [];
  }

  private getOptInStatsForCollection = async (
    collection: Collection,
    optInStatus: boolean,
    statsCollectionConfig: StatsCollectionConfig
  ) => {
    const context: StatsCollectionContext = {
      logger: this.logger.get(collection.title),
      version: this.version,
      ...collection.customContext,
    };

    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig, context);
    return clustersDetails.map(({ clusterUuid }) => ({
      cluster_uuid: clusterUuid,
      opt_in_status: optInStatus,
    }));
  };

  private async getStats(config: StatsGetterConfig) {
    if (!this.usageCollection) {
      return [];
    }
    for (const collection of this.collections) {
      const statsCollectionConfig = this.getStatsCollectionConfig(
        config,
        collection,
        this.usageCollection
      );
      try {
        const usageData = await this.getUsageForCollection(collection, statsCollectionConfig);
        if (usageData.length) {
          this.logger.debug(`Got Usage using ${collection.title} collection.`);
          if (config.unencrypted) {
            return usageData;
          }

          return encryptTelemetry(usageData, { useProdKey: this.isDistributable });
        }
      } catch (err) {
        this.logger.debug(
          `Failed to collect any usage with registered collection ${collection.title}.`
        );
        // swallow error to try next collection;
      }
    }

    return [];
  }

  private async getUsageForCollection(
    collection: Collection,
    statsCollectionConfig: StatsCollectionConfig
  ): Promise<UsageStatsPayload[]> {
    const context: StatsCollectionContext = {
      logger: this.logger.get(collection.title),
      version: this.version,
      ...collection.customContext,
    };

    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig, context);

    if (clustersDetails.length === 0) {
      // don't bother doing a further lookup, try next collection.
      return [];
    }

    const [stats, licenses] = await Promise.all([
      collection.statsGetter(clustersDetails, statsCollectionConfig, context),
      collection.licenseGetter(clustersDetails, statsCollectionConfig, context),
    ]);

    return stats.map((stat) => {
      const license = licenses[stat.cluster_uuid];
      return {
        ...(license ? { license } : {}),
        ...stat,
        collectionSource: collection.title,
      };
    });
  }
}
