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

import {
  LegacyAPICaller,
  ElasticsearchClient,
  Logger,
  KibanaRequest,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TelemetryCollectionManagerPlugin } from './plugin';

export interface TelemetryCollectionManagerPluginSetup {
  setCollectionStrategy: <T extends BasicStatsPayload>(
    collectionConfig: CollectionStrategyConfig<T>
  ) => void;
  getOptInStats: TelemetryCollectionManagerPlugin['getOptInStats'];
  getStats: TelemetryCollectionManagerPlugin['getStats'];
  areAllCollectorsReady: TelemetryCollectionManagerPlugin['areAllCollectorsReady'];
}

export interface TelemetryCollectionManagerPluginStart {
  getOptInStats: TelemetryCollectionManagerPlugin['getOptInStats'];
  getStats: TelemetryCollectionManagerPlugin['getStats'];
  areAllCollectorsReady: TelemetryCollectionManagerPlugin['areAllCollectorsReady'];
}

export interface TelemetryOptInStats {
  cluster_uuid: string;
  opt_in_status: boolean;
}

export interface BaseStatsGetterConfig {
  unencrypted: boolean;
  request?: KibanaRequest;
}

export interface EncryptedStatsGetterConfig extends BaseStatsGetterConfig {
  unencrypted: false;
}

export interface UnencryptedStatsGetterConfig extends BaseStatsGetterConfig {
  unencrypted: true;
  request: KibanaRequest;
}

export interface ClusterDetails {
  clusterUuid: string;
}

export interface StatsCollectionConfig {
  usageCollection: UsageCollectionSetup;
  callCluster: LegacyAPICaller;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract | ISavedObjectsRepository;
  kibanaRequest: KibanaRequest | undefined; // intentionally `| undefined` to enforce providing the parameter
}

export interface BasicStatsPayload {
  timestamp: string;
  cluster_uuid: string;
  cluster_name: string;
  version: string;
  cluster_stats: object;
  collection?: string;
  stack_stats: object;
}

export interface UsageStatsPayload extends BasicStatsPayload {
  collectionSource: string;
}

export interface StatsCollectionContext {
  logger: Logger | Console;
  version: string;
}

export type StatsGetterConfig = UnencryptedStatsGetterConfig | EncryptedStatsGetterConfig;
export type ClusterDetailsGetter = (
  config: StatsCollectionConfig,
  context: StatsCollectionContext
) => Promise<ClusterDetails[]>;
export type StatsGetter<T extends BasicStatsPayload = BasicStatsPayload> = (
  clustersDetails: ClusterDetails[],
  config: StatsCollectionConfig,
  context: StatsCollectionContext
) => Promise<T[]>;

export interface CollectionStrategyConfig<T extends BasicStatsPayload = BasicStatsPayload> {
  title: string;
  priority: number;
  statsGetter: StatsGetter<T>;
  clusterDetailsGetter: ClusterDetailsGetter;
}

export interface CollectionStrategy<T extends BasicStatsPayload = BasicStatsPayload> {
  statsGetter: StatsGetter<T>;
  clusterDetailsGetter: ClusterDetailsGetter;
  title: string;
}
