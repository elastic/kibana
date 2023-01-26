/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { PackageInfo } from '@kbn/core/server';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ISearchGeneric, ISearchStartSearchSource, SearchRequest } from '../../common/search';
import { AggsSetup, AggsSetupDependencies, AggsStart, AggsStartDependencies } from './aggs';
import { SearchUsageCollector } from './collectors';
import { ISessionsClient, ISessionService } from './session';

export { SEARCH_EVENT_TYPE } from './collectors';
export type { ISearchStartSearchSource, SearchUsageCollector };

/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  aggs: AggsSetup;
  usageCollector?: SearchUsageCollector;
  /**
   * Current session management
   * {@link ISessionService}
   */
  session: ISessionService;
  /**
   * Search sessions SO CRUD
   * {@link ISessionsClient}
   */
  sessionsClient: ISessionsClient;
}

/**
 * search service
 * @public
 */
export interface ISearchStart {
  /**
   * agg config sub service
   * {@link AggsStart}
   *
   */
  aggs: AggsStart;
  /**
   * low level search
   * {@link ISearchGeneric}
   */
  search: ISearchGeneric;
  /**
   * Show toast for caught error
   * @param e Error
   */
  showError: (e: Error) => void;
  /**
   * Show warnings, or customize how they're shown
   * @param inspector IInspectorInfo - an inspector object with requests internally collected
   * @param cb WarningHandlerCallback - optional callback to intercept warnings
   */
  showWarnings: (adapter: RequestAdapter, cb?: WarningHandlerCallback) => void;
  /**
   * high level search
   * {@link ISearchStartSearchSource}
   */
  searchSource: ISearchStartSearchSource;
  /**
   * Current session management
   * {@link ISessionService}
   */
  session: ISessionService;
  /**
   * Search sessions SO CRUD
   * {@link ISessionsClient}
   */
  sessionsClient: ISessionsClient;
}

/** @internal */
export interface SearchServiceSetupDependencies {
  packageInfo: PackageInfo;
  registerFunction: AggsSetupDependencies['registerFunction'];
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: AggsStartDependencies['fieldFormats'];
  indexPatterns: DataViewsContract;
}

/**
 * A warning object for a search response with internal ES timeouts
 * @public
 */
export interface SearchResponseTimeoutWarning {
  /**
   * type: for sorting out timeout warnings
   */
  type: 'timed_out';
  /**
   * message: human-friendly message
   */
  message: string;
  /**
   * reason: not given for timeout. This exists so that callers do not have to cast when working with shard failure warnings.
   */
  reason: undefined;
}

/**
 * A warning object for a search response with internal ES shard failures
 * @public
 */
export interface SearchResponseShardFailureWarning {
  /**
   * type: for sorting out shard failure warnings
   */
  type: 'shard_failure';
  /**
   * message: human-friendly message
   */
  message: string;
  /**
   * text: text to show in ShardFailureModal (optional)
   */
  text?: string;
  /**
   * reason: ShardFailureReason from es client
   */
  reason: {
    /**
     * type: failure code from Elasticsearch
     */
    type: 'generic_shard_warning' | estypes.ShardFailure['reason']['type'];
    /**
     * reason: failure reason from Elasticsearch
     */
    reason?: estypes.ShardFailure['reason']['reason'];
  };
}

/**
 * A warning object for a search response with warnings
 * @public
 */
export type SearchResponseWarning =
  | SearchResponseTimeoutWarning
  | SearchResponseShardFailureWarning;

/**
 * A callback function which can intercept warnings when passed to {@link showWarnings}. Pass `true` from the
 * function to prevent the search service from showing warning notifications by default.
 * @public
 */
export type WarningHandlerCallback = (
  warnings: SearchResponseWarning,
  meta: {
    request: SearchRequest;
    response: estypes.SearchResponse;
    requestId: string | undefined;
  }
) => boolean | undefined;
