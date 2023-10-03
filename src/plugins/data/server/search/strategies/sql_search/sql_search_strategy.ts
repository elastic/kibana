/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IncomingHttpHeaders } from 'http';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { catchError, tap } from 'rxjs/operators';
import { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
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
import { SearchConfigSchema } from '../../../../config';

export const sqlSearchStrategyProvider = (
  searchConfig: SearchConfigSchema,
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
    const startTime = Date.now();

    const search = async () => {
      const { keep_cursor: keepCursor, ...params } = request.params ?? {};
      let body: SqlQueryResponse;
      let headers: IncomingHttpHeaders;

      if (id) {
        ({ body, headers } = await client.sql.getAsync(
          {
            format: params?.format ?? 'json',
            ...getDefaultAsyncGetParams(searchConfig, options),
            id,
          },
          { ...options.transport, signal: options.abortSignal, meta: true }
        ));
      } else {
        ({ headers, body } = await client.sql.query(
          {
            format: params.format ?? 'json',
            ...getDefaultAsyncSubmitParams(searchConfig, options),
            ...params,
          },
          { ...options.transport, signal: options.abortSignal, meta: true }
        ));
      }

      if (!body.is_partial && !body.is_running && body.cursor && !keepCursor) {
        try {
          await client.sql.clearCursor({ cursor: body.cursor });
        } catch (error) {
          logger.warn(
            `sql search: failed to clear cursor=${body.cursor} for async_search_id=${id}: ${error.message}`
          );
        }
      }

      return toAsyncKibanaSearchResponse(body, startTime, headers?.warning);
    };

    const cancel = async () => {
      if (id) {
        await cancelAsyncSearch(id, esClient);
      }
    };

    return pollSearch(search, cancel, {
      pollInterval: searchConfig.asyncSearch.pollInterval,
      ...options,
    }).pipe(
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
