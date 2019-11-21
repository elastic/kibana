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

import { ES_SEARCH_STRATEGY } from '../../common/search/es_search';
import { SYNC_SEARCH_STRATEGY } from './sync_search_strategy';

/**
 * Contains all known strategy type identifiers that will be used to map to
 * request and response shapes. Plugins that wish to add their own custom search
 * strategies should extend this type via:
 *
 * const MY_STRATEGY = 'MY_STRATEGY';
 *
 * declare module 'src/plugins/data/public' {
 *  export interface IRequestTypesMap {
 *    [MY_STRATEGY]: IMySearchRequest;
 *  }
 *
 *  export interface IResponseTypesMap {
 *   [MY_STRATEGY]: IMySearchResponse
 *  }
 * }
 */
export type TStrategyTypes = typeof SYNC_SEARCH_STRATEGY | typeof ES_SEARCH_STRATEGY | string;
