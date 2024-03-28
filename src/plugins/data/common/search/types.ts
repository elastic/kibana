/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ConnectionRequestParams } from '@elastic/transport';
import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Observable } from 'rxjs';
import { IEsSearchRequest, IEsSearchResponse } from '..';

export type ISearchGeneric = <
  SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
>(
  request: SearchStrategyRequest,
  options?: ISearchOptions
) => Observable<SearchStrategyResponse>;

export type ISearchCancelGeneric = (id: string, options?: ISearchOptions) => Promise<void>;
export type ISearchExtendGeneric = (
  id: string,
  keepAlive: string,
  options?: ISearchOptions
) => Promise<void>;

export interface ISearchClient {
  search: ISearchGeneric;
  /**
   * Used to cancel an in-progress search request.
   */
  cancel: ISearchCancelGeneric;
  /**
   * Used to extend the TTL of an in-progress search request.
   */
  extend: ISearchExtendGeneric;
}

export type SanitizedConnectionRequestParams = Pick<
  ConnectionRequestParams,
  'method' | 'path' | 'querystring'
>;

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

export interface IEsErrorAttributes {
  error?: estypes.ErrorCause;
  rawResponse?: estypes.SearchResponseBody;
  requestParams?: SanitizedConnectionRequestParams;
}

export interface IKibanaSearchRequest<Params = any> {
  /**
   * An id can be used to uniquely identify this request.
   */
  id?: string;

  params?: Params;
}

export interface ISearchOptions {
  /**
   * An `AbortSignal` that allows the caller of `search` to abort a search request.
   */
  abortSignal?: AbortSignal;

  /**
   * Use this option to force using a specific server side search strategy. Leave empty to use the default strategy.
   */
  strategy?: string;

  /**
   * Request the legacy format for the total number of hits. If sending `rest_total_hits_as_int` to
   * something other than `true`, this should be set to `false`.
   */
  legacyHitsTotal?: boolean;

  /**
   * A session ID, grouping multiple search requests into a single session.
   */
  sessionId?: string;

  /**
   * Whether the session is already saved (i.e. sent to background)
   */
  isStored?: boolean;

  /**
   * Whether the search was successfully polled after session was saved. Search was added to a session saved object and keepAlive extended.
   */
  isSearchStored?: boolean;

  /**
   * Whether the session is restored (i.e. search requests should re-use the stored search IDs,
   * rather than starting from scratch)
   */
  isRestore?: boolean;

  /**
   * By default, when polling, we don't retrieve the results of the search request (until it is complete). (For async
   * search, this is the difference between calling _async_search/{id} and _async_search/status/{id}.) setting this to
   * `true` will request the search results, regardless of whether or not the search is complete.
   */
  retrieveResults?: boolean;

  /**
   * Represents a meta-information about a Kibana entity intitating a saerch request.
   */
  executionContext?: KibanaExecutionContext;

  /**
   * Index pattern reference is used for better error messages
   */
  indexPattern?: DataView;

  /**
   * TransportRequestOptions, other than `signal`, to pass through to the ES client.
   * To pass an abort signal, use {@link ISearchOptions.abortSignal}
   */
  transport?: Omit<TransportRequestOptions, 'signal'>;
}

/**
 * Same as `ISearchOptions`, but contains only serializable fields, which can
 * be sent over the network.
 */
export type ISearchOptionsSerializable = Pick<
  ISearchOptions,
  | 'strategy'
  | 'legacyHitsTotal'
  | 'sessionId'
  | 'isStored'
  | 'isSearchStored'
  | 'isRestore'
  | 'retrieveResults'
  | 'executionContext'
>;
