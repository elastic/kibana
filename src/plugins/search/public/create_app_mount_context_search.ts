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

import { mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { ISearchOptions } from './types';
import { ISearchAppMountContext } from './i_search_app_mount_context';
import { IKibanaClientSearchRequest, IKibanaClientSearchResponse } from './types';
import { IClientSearchStrategy } from './i_setup_contract';

interface CreateAppMountSearchContextParams {
  clientSearchStrategies: Map<string, () => Promise<IClientSearchStrategy<any, any>>>;
  defaultClientSearchStrategy: string;
}

export const createAppMountSearchContext = (
  params: CreateAppMountSearchContextParams
): ISearchAppMountContext => {
  return {
    search: <
      TRequest extends IKibanaClientSearchRequest,
      TResponse extends IKibanaClientSearchResponse<any>
    >(
      request: TRequest,
      options: ISearchOptions,
      strategyName: string
    ) => {
      const name = strategyName || params.defaultClientSearchStrategy;
      const strategyProvider = params.clientSearchStrategies.get(name);
      if (!strategyProvider) {
        throw new Error(`Strategy with name ${name} does not exist`);
      }
      const strategy = strategyProvider();
      return from(strategy).pipe(mergeMap(s => s.search(request, options)));
    },

    getClientSearchStrategy: <
      TRequest extends IKibanaClientSearchRequest,
      TResponse extends IKibanaClientSearchResponse<any>
    >(
      strategyName: string
    ) => {
      const name = strategyName || params.defaultClientSearchStrategy;
      const strategyProvider = params.clientSearchStrategies.get(name);
      if (!strategyProvider) {
        throw new Error(`Strategy with name ${name} does not exist`);
      }
      return strategyProvider();
    },
  };
};
