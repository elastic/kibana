/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DASHBOARD_API_PATH,
  DASHBOARD_API_VERSION,
  DASHBOARD_APP_API_PATH,
  DASHBOARD_APP_API_VERSION,
} from '../../common/constants';

export function getRouteConfig(isDashboardAppRequest: boolean) {
  return isDashboardAppRequest
    ? {
        basePath: DASHBOARD_APP_API_PATH,
        routeConfig: {
          // Never make dashboard application routes public
          // These are planned to be replaced by public REST routes
          access: 'internal',
          enableQueryVersion: true,
          description:
            'Dashboard application CRUD routes. Do not use outside of Kibana application. Instead, use dashboard REST API "/api/dashboards"',
          security: {
            authz: {
              enabled: false,
              reason: 'Relies on Content Client for authorization',
            },
          },
        } as const,
        routeVersion: DASHBOARD_APP_API_VERSION,
      }
    : {
        basePath: DASHBOARD_API_PATH,
        routeConfig: {
          access: 'public',
          description:
            'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
          options: {
            tags: ['oas-tag:Dashboards'],
            availability: {
              stability: 'experimental',
              since: '9.4.0',
            },
          },
          security: {
            authz: {
              enabled: false,
              reason: 'Relies on Content Client for authorization',
            },
          },
        } as const,
        routeVersion: DASHBOARD_API_VERSION,
      };
}
