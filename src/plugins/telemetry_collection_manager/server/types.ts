/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TelemetryCollectionManagerPlugin } from './plugin';

/**
 * Public contract coming from the setup method.
 */
export interface TelemetryCollectionManagerPluginSetup
  extends TelemetryCollectionManagerPluginStart {
  setCollectionStrategy: <T extends BasicStatsPayload>(
    collectionConfig: CollectionStrategyConfig<T>
  ) => void;
}

/**
 * Public contract coming from the start method.
 */
export interface TelemetryCollectionManagerPluginStart {
  /**
   * Fetches the minimum piece of data to report when Opting IN or OUT.
   */
  getOptInStats: TelemetryCollectionManagerPlugin['getOptInStats'];
  /**
   * Fetches the Snapshot telemetry report.
   */
  getStats: TelemetryCollectionManagerPlugin['getStats'];
  /**
   * Is it OK to fetch telemetry?
   *
   * It should be called before calling `getStats` or `getOptInStats` to validate that Kibana is in a healthy state
   * to attempt to fetch the Telemetry report.
   */
  shouldGetTelemetry: () => Promise<boolean>;
}

export interface TelemetryOptInStats {
  cluster_uuid: string;
  opt_in_status: boolean;
}

export interface BaseStatsGetterConfig {
  unencrypted: boolean;
  refreshCache?: boolean;
}

export interface EncryptedStatsGetterConfig extends BaseStatsGetterConfig {
  unencrypted: false;
}

export interface UnencryptedStatsGetterConfig extends BaseStatsGetterConfig {
  unencrypted: true;
}

export interface ClusterDetails {
  clusterUuid: string;
}

export interface StatsCollectionConfig {
  usageCollection: UsageCollectionSetup;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  refreshCache: boolean;
}

export interface CacheDetails {
  updatedAt: string;
  fetchedAt: string;
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
  cacheDetails: CacheDetails;
  collectionSource: string;
}

export interface OptInStatsPayload {
  cluster_uuid: string;
  opt_in_status: boolean;
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
