/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlViewsResult } from '@kbn/esql-types';
/**
 * Fetches all ES|QL views from the cluster (GET _query/view).
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the views list.
 */
export declare const getViews: (
  this:
    | {
        forceRefresh?: boolean;
      }
    | undefined
    | void,
  _http: import('@kbn/core/public').HttpSetup,
  _signal?: AbortSignal | undefined
) => Promise<EsqlViewsResult>;
