/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SanitizedConnectionRequestParams } from './types';

export interface IKibanaSearchRequest<Params = any> {
  /**
   * An id can be used to uniquely identify this request.
   */
  id?: string;

  params?: Params;
}

export interface IKibanaSearchResponse<RawResponse = any> {
  /**
   * Some responses may contain a unique id to identify the request this response came from.
   */
  id?: string;

  /**
   * If relevant to the search strategy, return a total number
   * that represents how progress is indicated.
   */
  total?: number;

  /**
   * If relevant to the search strategy, return a loaded number
   * that represents how progress is indicated.
   */
  loaded?: number;

  /**
   * Indicates whether search is still in flight
   */
  isRunning?: boolean;

  /**
   * Indicates whether the results returned are complete or partial
   */
  isPartial?: boolean;

  /**
   * Indicates whether the results returned are from the async-search index
   */
  isRestored?: boolean;

  /**
   * Indicates whether the search has been saved to a search-session object and long keepAlive was set
   */
  isStored?: boolean;

  /**
   * Optional warnings returned from Elasticsearch (for example, deprecation warnings)
   */
  warning?: string;

  /**
   * The raw response returned by the internal search method (usually the raw ES response)
   */
  rawResponse: RawResponse;

  /**
   * HTTP request parameters from elasticsearch transport client t
   */
  requestParams?: SanitizedConnectionRequestParams;
}
