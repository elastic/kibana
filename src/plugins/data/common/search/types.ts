/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from '@kbn/core/public';
import { Observable } from 'rxjs';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { IEsSearchRequest, IEsSearchResponse, IndexPattern } from '..';

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
   * Optional warnings returned from Elasticsearch (for example, deprecation warnings)
   */
  warning?: string;

  /**
   * The raw response returned by the internal search method (usually the raw ES response)
   */
  rawResponse: RawResponse;
}

export interface IKibanaSearchRequest<Params = any> {
  /**
   * An id can be used to uniquely identify this request.
   */
  id?: string;

  params?: Params;
}

export interface IInspectorInfo {
  adapter?: RequestAdapter;
  title: string;
  id?: string;
  description?: string;
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
   * Whether the session is restored (i.e. search requests should re-use the stored search IDs,
   * rather than starting from scratch)
   */
  isRestore?: boolean;

  /**
   * Index pattern reference is used for better error messages
   */
  indexPattern?: IndexPattern;

  /**
   * Inspector integration options
   */
  inspector?: IInspectorInfo;

  executionContext?: KibanaExecutionContext;
}

/**
 * Same as `ISearchOptions`, but contains only serializable fields, which can
 * be sent over the network.
 */
export type ISearchOptionsSerializable = Pick<
  ISearchOptions,
  'strategy' | 'legacyHitsTotal' | 'sessionId' | 'isStored' | 'isRestore' | 'executionContext'
>;
