/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ClusterDetails } from '@kbn/es-types';
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
 * A warning object for a search response with incomplete ES results
 * ES returns incomplete results when:
 * 1) Set timeout flag on search and the timeout expires on cluster
 * 2) Some shard failures on a cluster
 * 3) skipped remote(s) (skip_unavailable=true)
 *   a. all shards failed
 *   b. disconnected/not-connected
 * @public
 */
export interface SearchResponseIncompleteWarning {
  /**
   * type: for sorting out incomplete warnings
   */
  type: 'incomplete';
  /**
   * message: human-friendly message
   */
  message: string;
  /**
   * clusters: cluster details.
   */
  clusters: Record<string, ClusterDetails>;
  /**
   * openInInspector: callback to open warning in inspector
   */
  openInInspector: () => void;
}

/**
 * A warning object for a search response with warnings
 * @public
 */
export type SearchResponseWarning = SearchResponseIncompleteWarning;

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
