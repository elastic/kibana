/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_API_PATH, DASHBOARD_APP_API_PATH } from '../../common/constants';

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
        routeVersion: '1',
      }
    : {
        basePath: DASHBOARD_API_PATH,
        routeConfig: {
          // TODO change to public before FF
          access: 'internal',
          /**
           * `enableQueryVersion` is a temporary solution for testing internal endpoints.
           * Requests to these internal endpoints from Kibana Dev Tools or external clients
           * should include the ?apiVersion=1 query parameter.
           * This will be removed when the API is finalized and moved to a stable version.
           */
          enableQueryVersion: true,
          description:
            'This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
          options: {
            tags: ['oas-tag:Dashboards'],
            availability: {
              stability: 'experimental',
            },
          },
          security: {
            authz: {
              enabled: false,
              reason: 'Relies on Content Client for authorization',
            },
          },
        } as const,
        // TODO change to '2023-10-31' before FF
        routeVersion: '1',
      };
}
