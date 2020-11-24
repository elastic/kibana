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
import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { UIMetricUsage } from './telemetry_ui_metric_collector';

const commonSchema: MakeSchemaFrom<UIMetricUsage>[string] = {
  type: 'array',
  items: {
    key: { type: 'keyword' },
    value: { type: 'long' },
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
  timelion: commonSchema,
  visualize: commonSchema,

  // X-Pack
  apm: commonSchema,
  csm: commonSchema,
  canvas: commonSchema,
  dashboard_mode: commonSchema, // It's a forward app so we'll likely never report it
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
  securitySolution: commonSchema,
  'securitySolution:overview': commonSchema,
  'securitySolution:detections': commonSchema,
  'securitySolution:hosts': commonSchema,
  'securitySolution:network': commonSchema,
  'securitySolution:timelines': commonSchema,
  'securitySolution:case': commonSchema,
  'securitySolution:administration': commonSchema,
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
