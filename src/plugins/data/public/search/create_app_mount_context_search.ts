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
import { from, BehaviorSubject } from 'rxjs';
import { ISearchAppMountContext } from './i_search_app_mount_context';
import { ISearchGeneric } from './i_search';
import {
  TSearchStrategiesMap,
  ISearchStrategy,
  TSearchStrategyProviderEnhanced,
} from './i_search_strategy';
import { TStrategyTypes } from './strategy_types';
import { DEFAULT_SEARCH_STRATEGY } from '../../common/search';

export const createAppMountSearchContext = (
  searchStrategies: TSearchStrategiesMap,
  loadingCount$: BehaviorSubject<number>
): ISearchAppMountContext => {
  const getSearchStrategy = <K extends TStrategyTypes = typeof DEFAULT_SEARCH_STRATEGY>(
    strategyName?: K
  ): Promise<ISearchStrategy<K>> => {
    const strategyProvider = searchStrategies[
      strategyName ? strategyName : DEFAULT_SEARCH_STRATEGY
    ] as TSearchStrategyProviderEnhanced<K> | undefined;
    if (!strategyProvider) {
      throw new Error(`Strategy with name ${strategyName} does not exist`);
    }
    return strategyProvider(search);
  };

  const search: ISearchGeneric = (request, options, strategyName) => {
    const strategyPromise = getSearchStrategy(strategyName);
    return from(strategyPromise).pipe(
      mergeMap(strategy => {
        loadingCount$.next(loadingCount$.getValue() + 1);
        const search$ = strategy.search(request, options);
        search$.subscribe(() => {
          loadingCount$.next(loadingCount$.getValue() - 1);
        });
        return search$;
      })
    );
  };

  return { search };
};
