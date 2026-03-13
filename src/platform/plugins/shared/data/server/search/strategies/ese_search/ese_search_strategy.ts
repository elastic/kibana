/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Logger, SharedGlobalConfig } from '@kbn/core/server';
import { catchError, tap } from 'rxjs';
import { firstValueFrom, from } from 'rxjs';
import type { ISearchOptions, IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { IAsyncSearchRequestParams } from '../..';
import { getKbnSearchError, KbnSearchError } from '../../report_search_error';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type { IAsyncSearchOptions } from '../../../../common';
import { DataViewType, isRunningResponse, pollSearch } from '../../../../common';
import {
  getDefaultAsyncGetParams,
  getDefaultAsyncSubmitParams,
  getIgnoreThrottled,
} from './request_utils';
import { toAsyncKibanaSearchResponse, toAsyncKibanaSearchStatusResponse } from './response_utils';
import type { SearchUsage } from '../../collectors/search';
import { searchUsageObserver } from '../../collectors/search';
import { getDefaultSearchParams, getShardTimeout } from '../es_search';
import { getTotalLoaded, shimHitsTotal } from '../../../../common/search/strategies/es_search';
import type { SearchConfigSchema } from '../../../config';
import { sanitizeRequestParams } from '../../sanitize_request_params';

export const enhancedEsSearchStrategyProvider = (
  legacyConfig$: Observable<SharedGlobalConfig>,
  searchConfig: SearchConfigSchema,
  logger: Logger,
  usage?: SearchUsage,
  useInternalUser: boolean = false,
  isServerless: boolean = false
): ISearchStrategy<IEsSearchRequest<IAsyncSearchRequestParams>> => {
  function cancelAsyncSearch(id: string, { esClient }: SearchStrategyDependencies) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    return client.asyncSearch.delete({ id });
  }

  async function asyncSearchStatus(
    { id, ...request }: IEsSearchRequest<IAsyncSearchRequestParams>,
    options: IAsyncSearchOptions,
    { esClient }: Pick<SearchStrategyDependencies, 'esClient'>
  ) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    const keepAlive =
      request.params?.keep_alive ?? getDefaultAsyncGetParams(searchConfig, options).keep_alive;

    const { body, headers } = await client.asyncSearch.status(
      { id: id!, keep_alive: keepAlive },
      { ...options.transport, signal: options.abortSignal, meta: true }
    );
    return toAsyncKibanaSearchStatusResponse(body, headers?.warning);
  }

  // Gets the current status of the async search request. If the request is complete, then queries for the results.
  async function getAsyncSearch(
    { id, ...request }: IEsSearchRequest<IAsyncSearchRequestParams>,
    options: IAsyncSearchOptions,
    { esClient }: SearchStrategyDependencies
  ) {
    if (!options.retrieveResults) {
      // First, request the status of the async search, and return the status if incomplete
      const status = await asyncSearchStatus({ id, ...request }, options, { esClient });
      if (isRunningResponse(status)) return status;
    }

    // Then, if the search is complete, request & return the final results
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    const params = {
      ...getDefaultAsyncGetParams(searchConfig, options),
      ...(request.params?.keep_alive ? { keep_alive: request.params.keep_alive } : {}),
      ...(request.params?.wait_for_completion_timeout
        ? { wait_for_completion_timeout: request.params.wait_for_completion_timeout }
        : {}),
    };
    const { body, headers, meta } = await client.asyncSearch.get(
      { ...params, id: id! },
      {
        ...options.transport,
        signal: options.abortSignal,
        meta: true,
        asStream: options.stream,
      }
    );

    return toAsyncKibanaSearchResponse(body, headers, meta?.request?.params, options);
  }

  async function submitAsyncSearch(
    request: IEsSearchRequest<IAsyncSearchRequestParams>,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    const params = {
      ...(await getDefaultAsyncSubmitParams(uiSettingsClient, searchConfig, options, {
        isServerless,
        isPit: request.params?.pit != null,
      })),
      ...request.params,
    };
    const { body, headers, meta } = await client.asyncSearch.submit(params, {
      ...options.transport,
      signal: options.abortSignal,
      meta: true,
      asStream: options.stream,
    });

    return toAsyncKibanaSearchResponse(body, headers, meta?.request?.params, options);
  }

  function asyncSearch(
    { id, ...request }: IEsSearchRequest<IAsyncSearchRequestParams>,
    options: IAsyncSearchOptions,
    deps: SearchStrategyDependencies
  ) {
    const search = async () => {
      return id
        ? await getAsyncSearch({ id, ...request }, options, deps)
        : await submitAsyncSearch(request, options, deps);
    };

    const cancel = async () => {
      if (!id || options.isStored) return;
      try {
        await cancelAsyncSearch(id, deps);
      } catch (e) {
        // A 404 means either this search request does not exist, or that it is already cancelled
        if (e.meta?.statusCode === 404) return;

        // Log all other (unexpected) error messages
        logger.error(`cancelAsyncSearch error: ${e.message}`);
      }
    };

    return pollSearch(search, cancel, {
      pollInterval: searchConfig.asyncSearch.pollInterval,
      ...options,
    }).pipe(
      tap((response) => (id = response.id)),
      tap(searchUsageObserver(logger, usage)),
      catchError((e) => {
        throw getKbnSearchError(e);
      })
    );
  }

  async function rollupSearch(
    request: IEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    const legacyConfig = await firstValueFrom(legacyConfig$);
    const querystring = {
      ...getShardTimeout(legacyConfig),
      ...(await getIgnoreThrottled(uiSettingsClient)),
      ...(await getDefaultSearchParams(uiSettingsClient)),
    };

    // Custom 400 error here because the client tries to run `index.toString()` and we no-longer can rely on ES 400
    if (!request.params?.index) {
      throw new KbnSearchError(`"params.index" is required when performing a rollup search`, 400);
    }

    const { ignore_unavailable, preference, ...params } = {
      ...querystring,
      ...request.params,
      index: request.params.index,
    };

    try {
      const esResponse = await client.rollup.rollupSearch(
        {
          ...params,
          // Not defined in the spec, and the client places it in the body.
          // This workaround allows us to force it as a query parameter.
          querystring: { ...params.querystring, ignore_unavailable, preference },
        },
        {
          signal: options?.abortSignal,
          meta: true,
        }
      );

      const response = esResponse.body;
      return {
        rawResponse: shimHitsTotal(response, options),
        ...(esResponse.meta?.request?.params
          ? { requestParams: sanitizeRequestParams(esResponse.meta?.request?.params) }
          : {}),
        ...getTotalLoaded(response),
      };
    } catch (e) {
      throw getKbnSearchError(e);
    }
  }

  return {
    /**
     * @param request
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Observable<IEsSearchResponse<any>>`
     * @throws `KbnSearchError`
     */
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(() => `search ${JSON.stringify(request.params) || request.id}`);

      if (request.indexType === DataViewType.ROLLUP && deps.rollupsEnabled) {
        return from(rollupSearch(request, options, deps));
      } else {
        return asyncSearch(request, options, deps);
      }
    },
    /**
     * @param id async search ID to cancel, as returned from _async_search API
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Promise<void>`
     * @throws `KbnServerError`
     */
    cancel: async (id, options, deps) => {
      logger.debug(`cancel ${id}`);
      try {
        await cancelAsyncSearch(id, deps);
      } catch (e) {
        throw getKbnServerError(e);
      }
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
