/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ScopedClusterClient } from './scoped_cluster_client';
export { ClusterClient } from './cluster_client';
export { configureClient } from './configure_client';
export { getRequestDebugMeta, getErrorMessage } from './log_query_and_deprecation';
export {
  PRODUCT_RESPONSE_HEADER,
  DEFAULT_HEADERS,
  PRODUCT_ORIGIN_HEADER,
  RESERVED_HEADERS,
} from './headers';
