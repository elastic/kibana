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
import { ApplicationUsageTelemetryReport } from './telemetry_application_usage_collector';

const commonSchema: MakeSchemaFrom<ApplicationUsageTelemetryReport[string]> = {
  clicks_total: {
    type: 'long',
  },
  clicks_7_days: {
    type: 'long',
  },
  clicks_30_days: {
    type: 'long',
  },
  clicks_90_days: {
    type: 'long',
  },
  minutes_on_screen_total: {
    type: 'float',
  },
  minutes_on_screen_7_days: {
    type: 'float',
  },
  minutes_on_screen_30_days: {
    type: 'float',
  },
  minutes_on_screen_90_days: {
    type: 'float',
  },
};

// These keys obtained by searching for `/application\w*\.register\(/` and checking the value of the attr `id`.
// TODO: Find a way to update these keys automatically.
export const applicationUsageSchema = {
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
  securitySolution: commonSchema, // It's a forward app so we'll likely never report it
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
