/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * INTERNAL_API_VERSION is the temporary version for the internal API until the
 * public API is fully implemented and stable. When the public API is ready, this
 * const will be removed and a PUBLIC_API_VERSION (ex. 2023-10-31) will be introduced.
 */
export const INTERNAL_API_VERSION = '1';

export const commonRouteConfig = {
  // This route is in development and not yet intended for public use.
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
} as const;
