/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @public */
export const ELASTIC_HTTP_VERSION_HEADER = 'elastic-api-version' as const;
export const ELASTIC_HTTP_VERSION_QUERY_PARAM = 'apiVersion' as const;
export const ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM = 'elasticInternalOrigin' as const;
export const X_ELASTIC_INTERNAL_ORIGIN_REQUEST = 'x-elastic-internal-origin' as const;

/** @internal */
export const KIBANA_BUILD_NR_HEADER = 'kbn-build-number' as const;
