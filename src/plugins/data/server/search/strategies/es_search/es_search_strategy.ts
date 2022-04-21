/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Logger, SharedGlobalConfig } from '@kbn/core/server';
import { getKbnServerError, KbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { ISearchStrategy } from '../../types';
import type { SearchUsage } from '../../collectors';
import { getDefaultSearchParams, getShardTimeout } from './request_utils';
import { shimHitsTotal, toKibanaSearchResponse } from './response_utils';
import { searchUsageObserver } from '../../collectors/usage';

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
        const config = await firstValueFrom(config$);
        // @ts-expect-error params fall back to any, but should be valid SearchRequest params
        const { terminateAfter, ...requestParams } = request.params ?? {};
        const params = {
          ...(await getDefaultSearchParams(uiSettingsClient)),
          ...getShardTimeout(config),
          ...(terminateAfter ? { terminate_after: terminateAfter } : {}),
          ...requestParams,
        };
        const body = await esClient.asCurrentUser.search(params, {
          signal: abortSignal,
        });
        const response = shimHitsTotal(body, options);
        return toKibanaSearchResponse(response);
      } catch (e) {
        throw getKbnServerError(e);
      }
    };

    return from(search()).pipe(tap(searchUsageObserver(logger, usage, options)));
  },
});
