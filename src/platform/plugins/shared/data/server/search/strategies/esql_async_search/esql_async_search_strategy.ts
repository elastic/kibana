/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/core/server';
import { catchError, tap } from 'rxjs';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { SqlGetAsyncResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchParams } from '@kbn/es-types';
import { toAsyncKibanaSearchResponse } from './response_utils';
import {
  getCommonDefaultAsyncSubmitParams,
  getCommonDefaultAsyncGetParams,
} from '../common/async_utils';
import { pollSearch } from '../../../../common';
import { getKbnSearchError } from '../../report_search_error';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type { IAsyncSearchOptions } from '../../../../common';
import { SearchConfigSchema } from '../../../config';

// `drop_null_columns` is going to change the response
// now we get `all_columns` and `columns`
// `columns` contain only columns with data
// `all_columns` contain everything
type ESQLQueryRequest = ESQLSearchParams & SqlQueryRequest;

export const esqlAsyncSearchStrategyProvider = (
  searchConfig: SearchConfigSchema,
  logger: Logger
): ISearchStrategy<
  IKibanaSearchRequest<ESQLQueryRequest>,
  IKibanaSearchResponse<SqlGetAsyncResponse>
> => {
  function cancelEsqlAsyncSearch(
    id: string,
    { esClient }: Pick<SearchStrategyDependencies, 'esClient'>
  ) {
    return esClient.asCurrentUser.transport.request(
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

  function stopEsqlAsyncSearch(
    id: string,
    options: IAsyncSearchOptions,
    { esClient }: Pick<SearchStrategyDependencies, 'esClient'>
  ) {
    return esClient.asCurrentUser.transport.request<SqlGetAsyncResponse>(
      {
        method: 'POST',
        path: `/_query/async/${id}/stop`,
      },
      {
        ...options.transport,
        signal: options.abortSignal,
        meta: true,
        asStream: options.stream,
      }
    );
  }

  function getEsqlAsyncSearch(
    { id, ...request }: IKibanaSearchRequest<ESQLQueryRequest>,
    options: IAsyncSearchOptions,
    { esClient }: SearchStrategyDependencies
  ) {
    const params = {
      ...getCommonDefaultAsyncGetParams(searchConfig, options),
      ...(request.params?.keep_alive ? { keep_alive: request.params.keep_alive } : {}),
      ...(request.params?.wait_for_completion_timeout
        ? { wait_for_completion_timeout: request.params.wait_for_completion_timeout }
        : {}),
    };

    return esClient.asCurrentUser.transport.request<SqlGetAsyncResponse>(
      {
        method: 'GET',
        path: `/_query/async/${id}`,
        querystring: { ...params, drop_null_columns: request.params?.dropNullColumns },
      },
      {
        ...options.transport,
        signal: options.abortSignal,
        meta: true,
        asStream: options.stream,
      }
    );
  }

  async function submitEsqlSearch(
    { id, ...request }: IKibanaSearchRequest<ESQLQueryRequest>,
    options: IAsyncSearchOptions,
    { esClient }: SearchStrategyDependencies
  ) {
    const { dropNullColumns, ...requestParams } = request.params ?? {};

    const params = {
      ...(await getCommonDefaultAsyncSubmitParams(searchConfig, options)),
      ...requestParams,
    };

    return esClient.asCurrentUser.transport.request<SqlGetAsyncResponse>(
      {
        method: 'POST',
        path: `/_query/async`,
        body: params,
        querystring: dropNullColumns ? 'drop_null_columns' : '',
      },
      {
        ...options.transport,
        signal: options.abortSignal,
        meta: true,
        asStream: options.stream,
      }
    );
  }

  function esqlAsyncSearch(
    { id, ...request }: IKibanaSearchRequest<ESQLQueryRequest>,
    searchOptions: IAsyncSearchOptions,
    deps: SearchStrategyDependencies
  ) {
    // This abortSignal comes from getRequestAbortedSignal and fires if the HTTP request is aborted;
    // in the case of these async APIs, we  don't want to cancel the async request if the HTTP
    // request is aborted
    const { abortSignal, ...options } = searchOptions;
    const search = async () => {
      const response = await (!id
        ? submitEsqlSearch({ id, ...request }, options, deps)
        : options.retrieveResults
        ? stopEsqlAsyncSearch(id, options, deps)
        : getEsqlAsyncSearch({ id, ...request }, options, deps));

      const { body, headers, meta } = response;

      return toAsyncKibanaSearchResponse(body, headers, meta?.request?.params);
    };

    const cancel = async () => {
      if (!id || options.isStored) return;
      try {
        await cancelEsqlAsyncSearch(id, deps);
      } catch (e) {
        // A 404 means either this search request does not exist, or that it is already cancelled
        if (e.meta?.statusCode === 404) return;

        // Log all other (unexpected) error messages
        logger.error(`cancelEsqlAsyncSearch error: ${e.message}`);
      }
    };

    return pollSearch(search, cancel, {
      pollInterval: searchConfig.asyncSearch.pollInterval,
      ...options,
    }).pipe(
      tap((response) => (id = response.id)),
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
     * @returns `Observable<IKibanaResponse<SqlGetAsyncResponse>>`
     * @throws `KbnSearchError`
     */
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(() => `search ${JSON.stringify(request) || request.id}`);
      return esqlAsyncSearch(request, options, deps);
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
        await cancelEsqlAsyncSearch(id, deps);
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
        await esClient.asCurrentUser.transport.request(
          { method: 'GET', path: `/_query/async/${id}`, body: { id, keep_alive: keepAlive } },
          { ...options.transport, signal: options.abortSignal, meta: true }
        );
      } catch (e) {
        throw getKbnServerError(e);
      }
    },
  };
};
