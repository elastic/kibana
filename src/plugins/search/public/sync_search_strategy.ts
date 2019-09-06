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

import { Observable, from } from 'rxjs';
import { IKibanaSearchResponse } from '../common';
import { IClientSearchStrategy, TClientSearchStrategyProvider } from './i_setup_contract';
import { IKibanaClientSearchRequest, ISearchOptions } from './types';
import { ISearchContext } from './i_search_context';

const search = (context: ISearchContext) => (
  request: IKibanaClientSearchRequest,
  options: ISearchOptions
): Observable<IKibanaSearchResponse<any>> => {
  const response: Promise<IKibanaSearchResponse<any>> = context.core.http.fetch(
    `/api/search/${request.serverStrategy}`,
    {
      method: 'POST',
      body: JSON.stringify(request),
      signal: options.signal,
    }
  );

  return from(response);
};

export const syncSearchStrategyProvider: TClientSearchStrategyProvider<
  IKibanaClientSearchRequest,
  IKibanaSearchResponse<any>
> = (
  context: ISearchContext
): IClientSearchStrategy<IKibanaClientSearchRequest, IKibanaSearchResponse<any>> => {
  if (!context.core) {
    throw new Error('core undefined!');
  }
  return {
    search: (request, options) => search(context)(request, options),
  };
};
