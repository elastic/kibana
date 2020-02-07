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

import { encryptTelemetry } from './collectors';
import { CallCluster } from '../../elasticsearch';
import { UsageCollectionSetup } from '../../../../plugins/usage_collection/server';

export type EncryptedStatsGetterConfig = { unencrypted: false } & {
  server: any;
  start: string;
  end: string;
};

export type UnencryptedStatsGetterConfig = { unencrypted: true } & {
  req: any;
  start: string;
  end: string;
};

export interface ClusterDetails {
  clusterUuid: string;
}

export interface StatsCollectionConfig {
  usageCollection: UsageCollectionSetup;
  callCluster: CallCluster;
  server: any;
  start: string;
  end: string;
}

export type StatsGetterConfig = UnencryptedStatsGetterConfig | EncryptedStatsGetterConfig;
export type ClusterDetailsGetter = (config: StatsCollectionConfig) => Promise<ClusterDetails[]>;
export type StatsGetter = (
  clustersDetails: ClusterDetails[],
  config: StatsCollectionConfig
) => Promise<any[]>;

interface CollectionConfig {
  title: string;
  priority: number;
  esCluster: string;
  statsGetter: StatsGetter;
  clusterDetailsGetter: ClusterDetailsGetter;
}
interface Collection {
  statsGetter: StatsGetter;
  clusterDetailsGetter: ClusterDetailsGetter;
  esCluster: string;
  title: string;
}

export class TelemetryCollectionManager {
  private usageGetterMethodPriority = -1;
  private collections: Collection[] = [];

  public setCollection = (collectionConfig: CollectionConfig) => {
    const { title, priority, esCluster, statsGetter, clusterDetailsGetter } = collectionConfig;

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
        throw Error('Cluser UUIds method is not set.');
      }

      this.collections.unshift({
        statsGetter,
        clusterDetailsGetter,
        esCluster,
        title,
      });
      this.usageGetterMethodPriority = priority;
    }
  };

  private getStatsCollectionConfig = async (
    collection: Collection,
    config: StatsGetterConfig
  ): Promise<StatsCollectionConfig> => {
    const { start, end } = config;
    const server = config.unencrypted ? config.req.server : config.server;
    const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster(
      collection.esCluster
    );
    const callCluster = config.unencrypted
      ? (...args: any[]) => callWithRequest(config.req, ...args)
      : callWithInternalUser;

    const { usageCollection } = server.newPlatform.setup.plugins;
    return { server, callCluster, start, end, usageCollection };
  };

  private getOptInStatsForCollection = async (
    collection: Collection,
    optInStatus: boolean,
    statsCollectionConfig: StatsCollectionConfig
  ) => {
    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig);
    return clustersDetails.map(({ clusterUuid }) => ({
      cluster_uuid: clusterUuid,
      opt_in_status: optInStatus,
    }));
  };

  private getUsageForCollection = async (
    collection: Collection,
    statsCollectionConfig: StatsCollectionConfig
  ) => {
    const clustersDetails = await collection.clusterDetailsGetter(statsCollectionConfig);

    if (clustersDetails.length === 0) {
      // don't bother doing a further lookup, try next collection.
      return;
    }

    return await collection.statsGetter(clustersDetails, statsCollectionConfig);
  };

  public getOptInStats = async (optInStatus: boolean, config: StatsGetterConfig) => {
    for (const collection of this.collections) {
      const statsCollectionConfig = await this.getStatsCollectionConfig(collection, config);
      try {
        const optInStats = await this.getOptInStatsForCollection(
          collection,
          optInStatus,
          statsCollectionConfig
        );
        if (optInStats && optInStats.length) {
          statsCollectionConfig.server.log(
            ['debug', 'telemetry', 'collection'],
            `Got Opt In stats using ${collection.title} collection.`
          );
          if (config.unencrypted) {
            return optInStats;
          }
          const isDev = statsCollectionConfig.server.config().get('env.dev');
          return encryptTelemetry(optInStats, isDev);
        }
      } catch (err) {
        statsCollectionConfig.server.log(
          ['debu', 'telemetry', 'collection'],
          `Failed to collect any opt in stats with registered collections.`
        );
        // swallow error to try next collection;
      }
    }

    return [];
  };
  public getStats = async (config: StatsGetterConfig) => {
    for (const collection of this.collections) {
      const statsCollectionConfig = await this.getStatsCollectionConfig(collection, config);
      try {
        const usageData = await this.getUsageForCollection(collection, statsCollectionConfig);
        if (usageData && usageData.length) {
          statsCollectionConfig.server.log(
            ['debug', 'telemetry', 'collection'],
            `Got Usage using ${collection.title} collection.`
          );
          if (config.unencrypted) {
            return usageData;
          }
          const isDev = statsCollectionConfig.server.config().get('env.dev');
          return encryptTelemetry(usageData, isDev);
        }
      } catch (err) {
        statsCollectionConfig.server.log(
          ['debu', 'telemetry', 'collection'],
          `Failed to collect any usage with registered collections.`
        );
        // swallow error to try next collection;
      }
    }

    return [];
  };
}

export const telemetryCollectionManager = new TelemetryCollectionManager();
