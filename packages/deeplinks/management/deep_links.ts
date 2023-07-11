/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  MONITORING_APP_ID,
  INTEGRATIONS_APP_ID,
  FLEET_APP_ID,
  OSQUERY_APP_ID,
  MANAGEMENT_APP_ID,
} from './constants';

// Monitoring
export type MonitoringAppId = typeof MONITORING_APP_ID;
export type MonitoringDeepLinkId = MonitoringAppId;

// Integrations
export type IntegrationsAppId = typeof INTEGRATIONS_APP_ID;
export type FleetAppId = typeof FLEET_APP_ID;
export type OsQueryAppId = typeof OSQUERY_APP_ID;
export type IntegrationsDeepLinkId = IntegrationsAppId | FleetAppId | OsQueryAppId;

// Management
export type ManagementAppId = typeof MANAGEMENT_APP_ID;
export type ManagementId =
  | 'api_keys'
  | 'cases'
  | 'cross_cluster_replication'
  | 'dataViews'
  | 'index_lifecycle_management'
  | 'index_management'
  | 'ingest_pipelines'
  | 'jobsListLink'
  | 'objects'
  | 'pipelines'
  | 'remote_clusters'
  | 'reporting'
  | 'rollup_jobs'
  | 'settings'
  | 'snapshot_restore'
  | 'spaces'
  | 'tags'
  | 'transform'
  | 'triggersActions'
  | 'triggersActionsConnectors'
  | 'watcher';

export type ManagementDeepLinkId = MonitoringAppId | `${ManagementAppId}:${ManagementId}`;

// Combined
export type AppId = MonitoringAppId | IntegrationsAppId | ManagementAppId;
export type LinkId = ManagementId;
export type DeepLinkId =
  | AppId
  | MonitoringDeepLinkId
  | IntegrationsDeepLinkId
  | ManagementDeepLinkId;
