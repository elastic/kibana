/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, from, Observable } from 'rxjs';
import type { ConnectionRequestParams } from '@elastic/transport';
import { tap } from 'rxjs';
import type { Logger, SharedGlobalConfig } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';
import { shimHitsTotal, getTotalLoaded } from '../../../../common';
import { sanitizeRequestParams } from '../../sanitize_request_params';
import { getKbnSearchError, KbnSearchError } from '../../report_search_error';
import type { ISearchStrategy } from '../../types';
import type { SearchUsage } from '../../collectors/search';
import { getDefaultSearchParams, getShardTimeout } from './request_utils';
import { searchUsageObserver } from '../../collectors/search/usage';

/**
 * Get the Kibana representation of this response (see `IKibanaSearchResponse`).
 * @internal
 */
export function toKibanaSearchResponse(
  rawResponse: estypes.SearchResponse<unknown>,
  requestParams?: ConnectionRequestParams
) {
  return {
    rawResponse,
    isPartial: false,
    isRunning: false,
    ...(requestParams ? { requestParams: sanitizeRequestParams(requestParams) } : {}),
    ...getTotalLoaded(rawResponse),
  };
}

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => ({
  /**
   * @param request
   * @param options
   * @param deps
   * @throws `KbnSearchError`
   * @returns `Observable<IEsSearchResponse<any>>`
   */
  search: (request, { abortSignal, transport, ...options }, { esClient, uiSettingsClient }) => {
    // Only default index pattern type is supported here.
    // See ese for other type support.
    if (request.indexType) {
      throw new KbnSearchError(`Unsupported index pattern type ${request.indexType}`, 400);
    }

    const isPit = request.params?.body?.pit != null;

    const search = async () => {
      try {
        const config = await firstValueFrom(config$);
        // @ts-expect-error params fall back to any, but should be valid SearchRequest params
        const { terminateAfter, ...requestParams } = request.params ?? {};
        const defaults = await getDefaultSearchParams(uiSettingsClient, { isPit });

        const params = {
          ...defaults,
          ...getShardTimeout(config),
          ...(terminateAfter ? { terminate_after: terminateAfter } : {}),
          ...requestParams,
        };
        const { body, meta } = await esClient.asCurrentUser.search(params, {
          signal: abortSignal,
          ...transport,
          meta: true,
        });
        const response = shimHitsTotal(body, options);
        return toKibanaSearchResponse(response, meta?.request?.params);
      } catch (e) {
        throw getKbnSearchError(e);
      }
    };

    return from(search()).pipe(tap(searchUsageObserver(logger, usage, options)));
  },
});
