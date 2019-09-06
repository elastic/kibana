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

import { ISearchContext } from 'src/plugins/search/public';
import {
  TClientSearchStrategyProvider,
  IClientSearchStrategy,
  SYNC_SEARCH_STRATEGY,
} from '../../search/public';

import { ES_SEARCH_STRATEGY } from '../common';
import { IEsSearchRequest, IEsSearchResponse } from './types';

export const esClientSearchStrategyProvider: TClientSearchStrategyProvider<
  IEsSearchRequest,
  IEsSearchResponse<any>
> = (context: ISearchContext): IClientSearchStrategy<IEsSearchRequest, IEsSearchResponse<any>> => {
  return {
    search: (request, options) =>
      context.search.search(
        { ...request, serverStrategy: ES_SEARCH_STRATEGY },
        options,
        SYNC_SEARCH_STRATEGY
      ),
  };
};
