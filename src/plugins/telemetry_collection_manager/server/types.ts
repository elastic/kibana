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

import { LegacyAPICaller, Logger, KibanaRequest, ILegacyClusterClient } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TelemetryCollectionManagerPlugin } from './plugin';

export interface TelemetryCollectionManagerPluginSetup {
  setCollection: <CustomContext extends Record<string, any>, T extends BasicStatsPayload>(
    collectionConfig: CollectionConfig<CustomContext, T>
  ) => void;
  getOptInStats: TelemetryCollectionManagerPlugin['getOptInStats'];
  getStats: TelemetryCollectionManagerPlugin['getStats'];
}

export interface TelemetryCollectionManagerPluginStart {
  setCollection: <CustomContext extends Record<string, any>, T extends BasicStatsPayload>(
    collectionConfig: CollectionConfig<CustomContext, T>
  ) => void;
  getOptInStats: TelemetryCollectionManagerPlugin['getOptInStats'];
  getStats: TelemetryCollectionManagerPlugin['getStats'];
}

export interface TelemetryOptInStats {
  cluster_uuid: string;
  opt_in_status: boolean;
}

export interface BaseStatsGetterConfig {
  unencrypted: boolean;
  start: string;
  end: string;
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
  start: string | number;
  end: string | number;
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
  license?: ESLicense;
  collectionSource: string;
}

// From https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
export interface ESLicense {
  status: string;
  uid: string;
  type: string;
  issue_date: string;
  issue_date_in_millis: number;
  expiry_date: string;
  expirty_date_in_millis: number;
  max_nodes: number;
  issued_to: string;
  issuer: string;
  start_date_in_millis: number;
}

export interface StatsCollectionContext {
  logger: Logger;
  version: string;
}

export type StatsGetterConfig = UnencryptedStatsGetterConfig | EncryptedStatsGetterConfig;
export type ClusterDetailsGetter<CustomContext extends Record<string, any> = {}> = (
  config: StatsCollectionConfig,
  context: StatsCollectionContext & CustomContext
) => Promise<ClusterDetails[]>;
export type StatsGetter<
  CustomContext extends Record<string, any> = {},
  T extends BasicStatsPayload = BasicStatsPayload
> = (
  clustersDetails: ClusterDetails[],
  config: StatsCollectionConfig,
  context: StatsCollectionContext & CustomContext
) => Promise<T[]>;
export type LicenseGetter<CustomContext extends Record<string, any> = {}> = (
  clustersDetails: ClusterDetails[],
  config: StatsCollectionConfig,
  context: StatsCollectionContext & CustomContext
) => Promise<{ [clusterUuid: string]: ESLicense | undefined }>;

export interface CollectionConfig<
  CustomContext extends Record<string, any> = {},
  T extends BasicStatsPayload = BasicStatsPayload
> {
  title: string;
  priority: number;
  esCluster: ILegacyClusterClient;
  statsGetter: StatsGetter<CustomContext, T>;
  clusterDetailsGetter: ClusterDetailsGetter<CustomContext>;
  licenseGetter: LicenseGetter<CustomContext>;
  customContext?: CustomContext;
}

export interface Collection<
  CustomContext extends Record<string, any> = {},
  T extends BasicStatsPayload = BasicStatsPayload
> {
  customContext?: CustomContext;
  statsGetter: StatsGetter<CustomContext, T>;
  licenseGetter: LicenseGetter<CustomContext>;
  clusterDetailsGetter: ClusterDetailsGetter<CustomContext>;
  esCluster: ILegacyClusterClient;
  title: string;
}
