/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import type { Logger, SharedGlobalConfig } from 'kibana/server';
import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type {
  IAsyncSearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
} from '../../../../common';

import { getKbnServerError } from '../../../../../kibana_utils/server';
import { SearchUsage } from '../../collectors';
import {
  getDefaultSearchParams,
  getShardTimeout,
  getTotalLoaded,
  shimAbortSignal,
  shimHitsTotal,
} from '../es_search';
import { IRollupSearchRequest, IRollupSearchResponse } from '../../../../common/';
import { getIgnoreThrottled } from '../ese_search/request_utils';

export const rollupSearchStrategyProvider = (
  legacyConfig$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IRollupSearchRequest, IRollupSearchResponse> => {
  async function rollupSearch(
    request: IEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const legacyConfig = await legacyConfig$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = {
      ...getShardTimeout(legacyConfig),
      ...(await getIgnoreThrottled(uiSettingsClient)),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    };

    try {
      // TODO: use esClient.asCurrentUser.rollup.rollupSearch
      const promise = esClient.asCurrentUser.transport.request({
        method,
        path,
        body,
        querystring,
      });

      const esResponse = await shimAbortSignal(promise, options?.abortSignal);
      const response = esResponse.body as SearchResponse<any>;
      return {
        rawResponse: shimHitsTotal(response, options),
        ...getTotalLoaded(response),
      };
    } catch (e) {
      throw getKbnServerError(e);
    }
  }

  return {
    /**
     * @param request
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Observable<IEsSearchResponse<any>>`
     * @throws `KbnServerError`
     */
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

      return from(rollupSearch(request, options, deps));
    },
  };
};
