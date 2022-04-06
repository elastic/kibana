/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { IScopedClusterClient, Logger, SharedGlobalConfig } from 'kibana/server';
import { catchError, first, tap } from 'rxjs/operators';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { from } from 'rxjs';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type {
  IAsyncSearchOptions,
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
} from '../../../../common';
import { pollSearch } from '../../../../common';
import {
  getDefaultAsyncGetParams,
  getDefaultAsyncSubmitParams,
  getIgnoreThrottled,
} from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';
import { getKbnServerError, KbnServerError } from '../../../../../kibana_utils/server';
import { SearchUsage, searchUsageObserver } from '../../collectors/search';
import {
  getDefaultSearchParams,
  getShardTimeout,
  getTotalLoaded,
  shimHitsTotal,
} from '../es_search';

export const enhancedEsSearchStrategyProvider = (
  legacyConfig$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage,
  useInternalUser: boolean = false
): ISearchStrategy => {
  async function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    try {
      const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
      await client.asyncSearch.delete({ id });
    } catch (e) {
      throw getKbnServerError(e);
    }
  }

  function asyncSearch(
    { id, ...request }: IEsSearchRequest,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient, searchSessionsClient }: SearchStrategyDependencies
  ) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;

    const search = async () => {
      const params = id
        ? getDefaultAsyncGetParams(searchSessionsClient.getConfig(), options)
        : {
            ...(await getDefaultAsyncSubmitParams(
              uiSettingsClient,
              searchSessionsClient.getConfig(),
              options
            )),
            ...request.params,
          };
      const { body, headers } = id
        ? await client.asyncSearch.get(
            { ...params, id },
            { signal: options.abortSignal, meta: true }
          )
        : await client.asyncSearch.submit(params, {
            signal: options.abortSignal,
            meta: true,
          });

      const response = shimHitsTotal(body.response, options);

      return toAsyncKibanaSearchResponse(
        // @ts-expect-error @elastic/elasticsearch start_time_in_millis expected to be number
        { ...body, response },
        headers?.warning
      );
    };

    const cancel = async () => {
      if (id) {
        await cancelAsyncSearch(id, esClient);
      }
    };

    return pollSearch(search, cancel, options).pipe(
      tap((response) => (id = response.id)),
      tap(searchUsageObserver(logger, usage)),
      catchError((e) => {
        throw getKbnServerError(e);
      })
    );
  }

  async function rollupSearch(
    request: IEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
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
      const esResponse = await client.transport.request(
        {
          method,
          path,
          body,
          querystring,
        },
        {
          signal: options?.abortSignal,
          meta: true,
        }
      );

      const response = esResponse.body as estypes.SearchResponse<any>;
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
      if (request.indexType && request.indexType !== 'rollup') {
        throw new KbnServerError('Unknown indexType', 400);
      }

      if (request.indexType === undefined) {
        return asyncSearch(request, options, deps);
      } else {
        return from(rollupSearch(request, options, deps));
      }
    },
    /**
     * @param id async search ID to cancel, as returned from _async_search API
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Promise<void>`
     * @throws `KbnServerError`
     */
    cancel: async (id, options, { esClient }) => {
      logger.debug(`cancel ${id}`);
      await cancelAsyncSearch(id, esClient);
    },
    /**
     *
     * @param id async search ID to extend, as returned from _async_search API
     * @param keepAlive
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Promise<void>`
     * @throws `KbnServerError`
     */
    extend: async (id, keepAlive, options, { esClient }) => {
      logger.debug(`extend ${id} by ${keepAlive}`);
      try {
        const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
        await client.asyncSearch.get({
          id,
          keep_alive: keepAlive,
        });
      } catch (e) {
        throw getKbnServerError(e);
      }
    },
  };
};
