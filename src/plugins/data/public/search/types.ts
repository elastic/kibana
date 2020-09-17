/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { PackageInfo } from 'kibana/server';
import { LegacyApiCaller } from './legacy/es_client';
import { ISearchInterceptor } from './search_interceptor';
import { ISearchSource, SearchSourceFields } from './search_source';
import { SearchUsageCollector } from './collectors';
import { AggsSetup, AggsSetupDependencies, AggsStartDependencies, AggsStart } from './aggs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../common/search';
import { IndexPatternsContract } from '../../common/index_patterns/index_patterns';
import { UsageCollectionSetup } from '../../../usage_collection/public';

export interface ISearchOptions {
  signal?: AbortSignal;
  strategy?: string;
}

export type ISearch = (
  request: IKibanaSearchRequest,
  options?: ISearchOptions
) => Observable<IKibanaSearchResponse>;

export type ISearchGeneric = <
  SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
>(
  request: SearchStrategyRequest,
  options?: ISearchOptions
) => Observable<SearchStrategyResponse>;

export interface ISearchStartLegacy {
  esClient: LegacyApiCaller;
}

export interface SearchEnhancements {
  searchInterceptor: ISearchInterceptor;
}
/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  aggs: AggsSetup;
  usageCollector?: SearchUsageCollector;
  /**
   * @internal
   */
  __enhance: (enhancements: SearchEnhancements) => void;
}

export interface ISearchStart {
  aggs: AggsStart;
  search: ISearchGeneric;
  searchSource: {
    create: (fields?: SearchSourceFields) => Promise<ISearchSource>;
    createEmpty: () => ISearchSource;
  };
  /**
   * @deprecated
   * @internal
   */
  __LEGACY: ISearchStartLegacy;
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
  indexPatterns: IndexPatternsContract;
}
