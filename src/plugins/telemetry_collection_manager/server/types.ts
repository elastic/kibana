/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
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
