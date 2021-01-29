/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { ApplicationUsageTelemetryReport } from './telemetry_application_usage_collector';

const commonSchema: MakeSchemaFrom<ApplicationUsageTelemetryReport[string]> = {
  appId: { type: 'keyword' },
  viewId: { type: 'keyword' },
  clicks_total: { type: 'long' },
  clicks_7_days: { type: 'long' },
  clicks_30_days: { type: 'long' },
  clicks_90_days: { type: 'long' },
  minutes_on_screen_total: { type: 'float' },
  minutes_on_screen_7_days: { type: 'float' },
  minutes_on_screen_30_days: { type: 'float' },
  minutes_on_screen_90_days: { type: 'float' },
  views: {
    type: 'array',
    items: {
      appId: { type: 'keyword' },
      viewId: { type: 'keyword' },
      clicks_total: { type: 'long' },
      clicks_7_days: { type: 'long' },
      clicks_30_days: { type: 'long' },
      clicks_90_days: { type: 'long' },
      minutes_on_screen_total: { type: 'float' },
      minutes_on_screen_7_days: { type: 'float' },
      minutes_on_screen_30_days: { type: 'float' },
      minutes_on_screen_90_days: { type: 'float' },
    },
  },
};

// There is a test in x-pack/test/usage_collection that validates that the keys in here match all the registered apps
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
  error: commonSchema,
  status: commonSchema,
  kibanaOverview: commonSchema,

  // X-Pack
  apm: commonSchema,
  canvas: commonSchema,
  dashboard_mode: commonSchema, // It's a forward app so we'll likely never report it
  enterpriseSearch: commonSchema,
  appSearch: commonSchema,
  workplaceSearch: commonSchema,
  graph: commonSchema,
  logs: commonSchema,
  metrics: commonSchema,
  infra: commonSchema, // It's a forward app so we'll likely never report it
  fleet: commonSchema,
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
  ux: commonSchema,
};
