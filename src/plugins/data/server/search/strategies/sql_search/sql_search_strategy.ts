/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { catchError, tap } from 'rxjs/operators';
import { SqlGetAsyncRequest, SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { ISearchStrategy, SearchStrategyDependencies } from '../../types';
import type {
  IAsyncSearchOptions,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
} from '../../../../common';
import { pollSearch } from '../../../../common';
import { getDefaultAsyncGetParams, getDefaultAsyncSubmitParams } from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';

export const sqlSearchStrategyProvider = (
  logger: Logger,
  useInternalUser: boolean = false
): ISearchStrategy<SqlSearchStrategyRequest, SqlSearchStrategyResponse> => {
  async function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    try {
      const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
      await client.sql.deleteAsync({ id });
    } catch (e) {
      throw getKbnServerError(e);
    }
  }

  function asyncSearch(
    { id, ...request }: SqlSearchStrategyRequest,
    options: IAsyncSearchOptions,
    { esClient }: SearchStrategyDependencies
  ) {
    const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;

    // disable search sessions until session task manager supports SQL
    // https://github.com/elastic/kibana/issues/127880
    // const sessionConfig = searchSessionsClient.getConfig();
    const sessionConfig = null;

    const search = async () => {
      if (id) {
        const params: SqlGetAsyncRequest = {
          format: request.params?.format ?? 'json',
          ...getDefaultAsyncGetParams(sessionConfig, options),
          id,
        };

        const { body, headers } = await client.sql.getAsync(params, {
          signal: options.abortSignal,
          meta: true,
        });

        return toAsyncKibanaSearchResponse(body, headers?.warning);
      } else {
        const params: SqlQueryRequest = {
          format: request.params?.format ?? 'json',
          ...getDefaultAsyncSubmitParams(sessionConfig, options),
          ...request.params,
        };

        const { headers, body } = await client.sql.query(params, {
          signal: options.abortSignal,
          meta: true,
        });

        return toAsyncKibanaSearchResponse(body, headers?.warning);
      }
    };

    const cancel = async () => {
      if (id) {
        await cancelAsyncSearch(id, esClient);
      }
    };

    return pollSearch(search, cancel, options).pipe(
      tap((response) => (id = response.id)),
      catchError((e) => {
        throw getKbnServerError(e);
      })
    );
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
      logger.debug(`sql search: search request=${JSON.stringify(request)}`);

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
      logger.debug(`sql search: cancel async_search_id=${id}`);
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
      logger.debug(`sql search: extend async_search_id=${id}  keep_alive=${keepAlive}`);
      try {
        const client = useInternalUser ? esClient.asInternalUser : esClient.asCurrentUser;
        await client.sql.getAsync({
          id,
          keep_alive: keepAlive,
        });
      } catch (e) {
        throw getKbnServerError(e);
      }
    },
  };
};
