/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Project routing constants for Cross-project search
 * These are stored as strings in saved objects to explicitly override parent values
 */
export const PROJECT_ROUTING = {
  /** Search across all linked projects */
  ALL: '_alias:*',
  /** Search only the origin project */
  ORIGIN: '_alias:_origin',
} as const;

export type ProjectRoutingValue = (typeof PROJECT_ROUTING)[keyof typeof PROJECT_ROUTING];

/**
 * HTTP header name used to propagate the CPS `project_routing` value from the browser to
 * Kibana server-side route handlers. App developers set this header on outgoing HTTP requests
 * (via the Kibana HTTP client) and opt in on the server by calling
 * `esClient.asScoped(request, { projectRouting: 'request-header' })`.
 */
export const KBN_PROJECT_ROUTING_HEADER = 'x-kbn-project-routing' as const;
