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

/**
 * Nothing to see here!
 *
 * Courier / SearchSource has moved to the data plugin, and is being
 * re-exported from ui/courier for backwards compatibility.
 */

import { start as dataStart } from '../../../core_plugins/data/public/legacy';

// runtime contracts
export const { SearchSource } = dataStart.search;

// types
export {
  SearchSourceContract,
  EsQuerySortValue, // used externally by Discover
  FetchOptions, // used externally by AggTypes
  SortDirection, // used externally by Discover
} from '../../../core_plugins/data/public';

// static code
export {
  getRequestInspectorStats,
  getResponseInspectorStats,
} from '../../../core_plugins/data/public';

// TODO: Exporting this mock outside of jest tests causes errors because
// jest is undefined. Need to refactor the mock to be consistent with
// other NP-style mocks.
// export { searchSourceMock } from './search_source/mocks';

// Most these can probably be made internal to the search
// service, so we are temporarily deeply importing them
// until we relocate them to a longer-term home.
/* eslint-disable @kbn/eslint/no-restricted-paths */
export {
  addSearchStrategy, // used externally by Rollups
  getSearchErrorType, // used externally by Rollups
  hasSearchStategyForIndexPattern, // used externally by Discover
  isDefaultTypeIndexPattern, // used externally by Discover
  SearchError, // used externally by Visualizations & Rollups
} from '../../../core_plugins/data/public/search/search_strategy';
/* eslint-enable @kbn/eslint/no-restricted-paths */
