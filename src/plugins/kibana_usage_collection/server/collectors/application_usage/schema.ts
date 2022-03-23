/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { ApplicationUsageTelemetryReport } from './types';

const commonSchema: MakeSchemaFrom<ApplicationUsageTelemetryReport[string]> = {
  appId: { type: 'keyword', _meta: { description: 'The application being tracked' } },
  viewId: { type: 'keyword', _meta: { description: 'Always `main`' } },
  clicks_total: {
    type: 'long',
    _meta: {
      description: 'General number of clicks in the application since we started counting them',
    },
  },
  clicks_7_days: {
    type: 'long',
    _meta: { description: 'General number of clicks in the application over the last 7 days' },
  },
  clicks_30_days: {
    type: 'long',
    _meta: { description: 'General number of clicks in the application over the last 30 days' },
  },
  clicks_90_days: {
    type: 'long',
    _meta: { description: 'General number of clicks in the application over the last 90 days' },
  },
  minutes_on_screen_total: {
    type: 'float',
    _meta: {
      description:
        'Minutes the application is active and on-screen since we started counting them.',
    },
  },
  minutes_on_screen_7_days: {
    type: 'float',
    _meta: { description: 'Minutes the application is active and on-screen over the last 7 days' },
  },
  minutes_on_screen_30_days: {
    type: 'float',
    _meta: { description: 'Minutes the application is active and on-screen over the last 30 days' },
  },
  minutes_on_screen_90_days: {
    type: 'float',
    _meta: { description: 'Minutes the application is active and on-screen over the last 90 days' },
  },
  views: {
    type: 'array',
    items: {
      appId: { type: 'keyword', _meta: { description: 'The application being tracked' } },
      viewId: { type: 'keyword', _meta: { description: 'The application view being tracked' } },
      clicks_total: {
        type: 'long',
        _meta: {
          description:
            'General number of clicks in the application sub view since we started counting them',
        },
      },
      clicks_7_days: {
        type: 'long',
        _meta: {
          description:
            'General number of clicks in the active application sub view over the last 7 days',
        },
      },
      clicks_30_days: {
        type: 'long',
        _meta: {
          description:
            'General number of clicks in the active application sub view over the last 30 days',
        },
      },
      clicks_90_days: {
        type: 'long',
        _meta: {
          description:
            'General number of clicks in the active application sub view over the last 90 days',
        },
      },
      minutes_on_screen_total: {
        type: 'float',
        _meta: {
          description:
            'Minutes the application sub view is active and on-screen since we started counting them.',
        },
      },
      minutes_on_screen_7_days: {
        type: 'float',
        _meta: {
          description:
            'Minutes the application is active and on-screen active application sub view over the last 7 days',
        },
      },
      minutes_on_screen_30_days: {
        type: 'float',
        _meta: {
          description:
            'Minutes the application is active and on-screen active application sub view over the last 30 days',
        },
      },
      minutes_on_screen_90_days: {
        type: 'float',
        _meta: {
          description:
            'Minutes the application is active and on-screen active application sub view over the last 90 days',
        },
      },
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
  visualize: commonSchema,
  error: commonSchema,
  status: commonSchema,
  kibanaOverview: commonSchema,
  r: commonSchema,

  // X-Pack
  apm: commonSchema,
  canvas: commonSchema,
  enterpriseSearch: commonSchema,
  appSearch: commonSchema,
  workplaceSearch: commonSchema,
  graph: commonSchema,
  logs: commonSchema,
  metrics: commonSchema,
  infra: commonSchema, // It's a forward app so we'll likely never report it
  fleet: commonSchema,
  integrations: commonSchema,
  ingestManager: commonSchema,
  lens: commonSchema,
  maps: commonSchema,
  ml: commonSchema,
  monitoring: commonSchema,
  'observability-overview': commonSchema,
  osquery: commonSchema,
  security_account: commonSchema,
  reportingRedirect: commonSchema,
  security_access_agreement: commonSchema,
  security_capture_url: commonSchema, // It's a forward app so we'll likely never report it
  security_logged_out: commonSchema,
  security_login: commonSchema,
  security_logout: commonSchema,
  security_overwritten_session: commonSchema,
  securitySolutionUI: commonSchema,
  /**
   * @deprecated legacy key for users that still have bookmarks to the old siem name. "securitySolutionUI" key is the replacement
   * @removeBy 9.0.0
   */
  siem: commonSchema,
  space_selector: commonSchema,
  uptime: commonSchema,
  ux: commonSchema,
};
