/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { IScopedClusterClient, Logger, SharedGlobalConfig } from '@kbn/core/server';
import { catchError, tap } from 'rxjs/operators';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import { EsqlAsyncSearchResponse } from './types';
import { IAsyncSearchRequestParams } from '../..';
import { getKbnSearchError } from '../../report_search_error';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type { IAsyncSearchOptions, IEsSearchRequest } from '../../../../common';
import { pollSearch } from '../../../../common';
import { getDefaultAsyncGetParams, getDefaultAsyncSubmitParams } from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';
import { SearchUsage, searchUsageObserver } from '../../collectors/search';
import { SearchConfigSchema } from '../../../../config';

export const esqlAsyncSearchStrategyProvider = (
  legacyConfig$: Observable<SharedGlobalConfig>,
  searchConfig: SearchConfigSchema,
  logger: Logger,
  usage?: SearchUsage,
  useInternalUser: boolean = false
): ISearchStrategy<IEsSearchRequest<IAsyncSearchRequestParams>> => {
  function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
    return client.transport.request(
      {
        method: 'DELETE',
        path: `/_query/async/${id}`,
      },
      {
        meta: true,
        // we don't want the ES client to retry (default value is 3)
        maxRetries: 0,
      }
    );
  }

  function asyncSearch(
    { id, ...request }: IEsSearchRequest<IAsyncSearchRequestParams>,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;

    const search = async () => {
      const params = id
        ? {
            ...getDefaultAsyncGetParams(searchConfig, options),
            ...(request.params?.keep_alive ? { keep_alive: request.params.keep_alive } : {}),
            ...(request.params?.wait_for_completion_timeout
              ? { wait_for_completion_timeout: request.params.wait_for_completion_timeout }
              : {}),
          }
        : {
            ...(await getDefaultAsyncSubmitParams(uiSettingsClient, searchConfig, options)),
            ...request.params,
          };
      const { body, headers, meta } = id
        ? await client.transport.request(
            { method: 'GET', path: `/_query/async/${id}`, body: { ...params, id } },
            { ...options.transport, signal: options.abortSignal, meta: true }
          )
        : await client.transport.request(
            { method: 'POST', path: `/_query/async`, body: params },
            { ...options.transport, signal: options.abortSignal, meta: true }
          );

      const finalResponse = toAsyncKibanaSearchResponse(
        body as EsqlAsyncSearchResponse,
        headers?.warning,
        // do not return requestParams on polling calls
        id ? undefined : meta?.request?.params
      );
      return finalResponse;
    };

    const cancel = async () => {
      if (!id || options.isStored) return;
      try {
        await cancelAsyncSearch(id, esClient);
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

  return {
    /**
     * @param request
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Observable<IEsSearchResponse<any>>`
     * @throws `KbnSearchError`
     */
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

      return asyncSearch(request, options, deps);
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
      try {
        await cancelAsyncSearch(id, esClient);
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
        await client.transport.request(
          { method: 'GET', path: `/_query/async/${id}`, body: { id, keep_alive: keepAlive } },
          { ...options.transport, signal: options.abortSignal, meta: true }
        );
      } catch (e) {
        throw getKbnServerError(e);
      }
    },
  };
};
