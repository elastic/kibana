/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { IExternalUrlPolicy } from './src/external_url_policy';

export type { ApiVersion } from './src/versioning';
export {
  ELASTIC_HTTP_VERSION_HEADER,
  ELASTIC_HTTP_VERSION_QUERY_PARAM,
  ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
  KIBANA_BUILD_NR_HEADER,
} from './src/constants';
