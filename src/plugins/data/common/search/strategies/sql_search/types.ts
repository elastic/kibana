/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SqlGetAsyncRequest,
  SqlQueryRequest,
  SqlQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../types';

export const SQL_SEARCH_STRATEGY = 'sql';

export type SqlRequestParams =
  | Omit<SqlQueryRequest, 'keep_alive' | 'keep_on_completion'>
  | Omit<SqlGetAsyncRequest, 'id' | 'keep_alive' | 'keep_on_completion'>;
export type SqlSearchStrategyRequest = IKibanaSearchRequest<SqlRequestParams>;

export type SqlSearchStrategyResponse = IKibanaSearchResponse<SqlQueryResponse>;
