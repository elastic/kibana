/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { UIMetricUsage } from './telemetry_ui_metric_collector';

const commonSchema: MakeSchemaFrom<UIMetricUsage>[string] = {
  type: 'array',
  items: {
    key: { type: 'keyword', _meta: { description: 'The event that is tracked' } },
    value: { type: 'long', _meta: { description: 'The value of the event' } },
  },
};

// TODO: Find a way to retrieve it automatically
// plugin `data` registers all UI Metric for each appId where searches are performed (keys below are copy-pasted from application_usage)
const uiMetricFromDataPluginSchema: MakeSchemaFrom<UIMetricUsage> = {
  // OSS
  dashboards: commonSchema,
  dev_tools: commonSchema,
  discover: commonSchema,
  home: commonSchema,
  kibana: commonSchema, // It's a forward app so we'll likely never report it
  management: commonSchema,
  short_url_redirect: commonSchema, // It's a forward app so we'll likely never report it
  visualize: commonSchema,

  // X-Pack
  apm: commonSchema,
  csm: commonSchema,
  canvas: commonSchema,
  enterpriseSearch: commonSchema,
  appSearch: commonSchema,
  workplaceSearch: commonSchema,
  graph: commonSchema,
  logs: commonSchema,
  metrics: commonSchema,
  infra: commonSchema, // It's a forward app so we'll likely never report it
  ingestManager: commonSchema,
  lens: commonSchema,
  maps: commonSchema,
  ml: commonSchema,
  monitoring: commonSchema,
  'observability-overview': commonSchema,
  security_account: commonSchema,
  security_access_agreement: commonSchema,
  security_capture_url: commonSchema, // It's a forward app so we'll likely never report it
  security_logged_out: commonSchema,
  security_login: commonSchema,
  security_logout: commonSchema,
  security_overwritten_session: commonSchema,
  securitySolutionUI: commonSchema,
  'securitySolutionUI:overview': commonSchema,
  'securitySolutionUI:detections': commonSchema,
  'securitySolutionUI:hosts': commonSchema,
  'securitySolutionUI:network': commonSchema,
  'securitySolutionUI:timelines': commonSchema,
  'securitySolutionUI:case': commonSchema,
  'securitySolutionUI:administration': commonSchema,
  /**
   * @deprecated legacy key for users that still have bookmarks to the old siem name. "securitySolutionUI" key is the replacement
   * @removeBy 9.0.0
   */
  siem: commonSchema,
  space_selector: commonSchema,
  uptime: commonSchema,
};

// TODO: Find a way to retrieve it automatically
// Searching `reportUiCounter` across Kibana
export const uiMetricSchema: MakeSchemaFrom<UIMetricUsage> = {
  console: commonSchema,
  DashboardPanelVersionInUrl: commonSchema,
  Kibana_home: commonSchema, // eslint-disable-line @typescript-eslint/naming-convention
  visualize: commonSchema,
  canvas: commonSchema,
  cross_cluster_replication: commonSchema,
  index_lifecycle_management: commonSchema,
  index_management: commonSchema,
  ingest_pipelines: commonSchema,
  apm: commonSchema,
  infra_logs: commonSchema,
  infra_metrics: commonSchema,
  stack_monitoring: commonSchema,
  remote_clusters: commonSchema,
  rollup_jobs: commonSchema,
  securitySolution: commonSchema,
  snapshot_restore: commonSchema,
  ...uiMetricFromDataPluginSchema,
};
