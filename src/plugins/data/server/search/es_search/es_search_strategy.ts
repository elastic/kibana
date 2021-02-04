/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, Observable } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import type { SearchResponse } from 'elasticsearch';
import type { Logger, SharedGlobalConfig } from 'kibana/server';
import type { ISearchStrategy } from '../types';
import type { SearchUsage } from '../collectors';
import { getDefaultSearchParams, getShardTimeout, shimAbortSignal } from './request_utils';
import { shimHitsTotal, toKibanaSearchResponse } from './response_utils';
import { searchUsageObserver } from '../collectors/usage';
import { getKbnServerError, KbnServerError } from '../../../../kibana_utils/server';

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => ({
  /**
   * @param request
   * @param options
   * @param deps
   * @throws `KbnServerError`
   * @returns `Observable<IEsSearchResponse<any>>`
   */
  search: (request, { abortSignal, ...options }, { esClient, uiSettingsClient }) => {
    // Only default index pattern type is supported here.
    // See data_enhanced for other type support.
    if (request.indexType) {
      throw new KbnServerError(`Unsupported index pattern type ${request.indexType}`, 400);
    }

    const search = async () => {
      try {
        const config = await config$.pipe(first()).toPromise();
        const params = {
          ...(await getDefaultSearchParams(uiSettingsClient)),
          ...getShardTimeout(config),
          ...request.params,
        };
        const promise = esClient.asCurrentUser.search<SearchResponse<unknown>>(params);
        const { body } = await shimAbortSignal(promise, abortSignal);
        const response = shimHitsTotal(body, options);
        return toKibanaSearchResponse(response);
      } catch (e) {
        throw getKbnServerError(e);
      }
    };

    return from(search()).pipe(tap(searchUsageObserver(logger, usage)));
  },
});
