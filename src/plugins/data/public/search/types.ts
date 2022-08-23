/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PackageInfo } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { estypes } from '@elastic/elasticsearch';
import { SearchUsageCollector } from './collectors';
import { AggsSetup, AggsSetupDependencies, AggsStartDependencies, AggsStart } from './aggs';
import { IInspectorInfo, ISearchGeneric, ISearchStartSearchSource } from '../../common/search';
import { ISessionsClient, ISessionService } from './session';
import { WarningHandlerCallback } from './fetch';

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
  showWarnings: (inspector: IInspectorInfo, cb?: WarningHandlerCallback) => void;
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

export { SEARCH_EVENT_TYPE } from './collectors';

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
 * Format of warnings of failed shards or internal ES timeouts that surface from search responses
 * @public
 */
export interface SearchResponseWarning {
  /**
   * type:  for handling the warning in logic
   */
  type: 'timed_out' | 'generic_shard_warning' | estypes.ShardFailure['reason']['reason'];
  /**
   * isTimeout: true for general internal ES timeout warning
   */
  isTimeout?: boolean;
  /**
   * isTimeout: true for shard-specific internal ES warning
   */
  isShardFailure?: boolean;
  /**
   * message: failure reason from ES
   */
  message: string;
  /**
   * text: human-friendly error message
   */
  text?: string;
}
