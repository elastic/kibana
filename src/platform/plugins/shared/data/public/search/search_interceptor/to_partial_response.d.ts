/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IEsSearchResponse } from '@kbn/search-types';
/**
 * When we hit the advanced setting `search:timeout`, we cancel in-progress search requests. This method takes the
 * active raw response from ES (status: "running") and returns a request in the format expected by our helper utilities
 * (status: "partial") that display cluster info, warnings, & errors.
 * @param response The raw ES response
 */
export declare function toPartialResponseAfterTimeout(
  response: IEsSearchResponse
): IEsSearchResponse;
