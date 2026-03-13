/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Project routing expression that restricts requests to the origin project only.
 */
export const PROJECT_ROUTING_ORIGIN = '_alias:_origin';

/**
 * Project routing expression that allows requests across all projects.
 */
export const PROJECT_ROUTING_ALL = '_alias:*';

/**
 * HTTP header name used to propagate the CPS `project_routing` value from the browser to
 * Kibana server-side route handlers. App developers set this header on outgoing HTTP requests
 * (via the Kibana HTTP client) and opt in on the server by calling
 * `esClient.asScoped(request, { projectRouting: 'request-header' })`.
 */
export const KBN_PROJECT_ROUTING_HEADER = 'x-kbn-project-routing' as const;
