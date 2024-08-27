/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import { tap } from 'rxjs';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import { SearchConfigSchema } from '../../../../config';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  IAsyncSearchOptions,
  pollSearch,
} from '../../../../common';
import { toEqlKibanaSearchResponse } from './response_utils';
import { EqlSearchResponse } from './types';
import { ISearchStrategy } from '../../types';
import { getDefaultSearchParams } from '../es_search';
import { getIgnoreThrottled } from '../ese_search/request_utils';
import { getCommonDefaultAsyncGetParams } from '../common/async_utils';

export const eqlSearchStrategyProvider = (
  searchConfig: SearchConfigSchema,
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    const client = esClient.asCurrentUser.eql;
    return client.delete({ id });
  }

  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      try {
        await cancelAsyncSearch(id, esClient);
      } catch (e) {
        throw getKbnServerError(e);
      }
    },

    search: ({ id, ...request }, options: IAsyncSearchOptions, { esClient, uiSettingsClient }) => {
      logger.debug(() => `_eql/search ${JSON.stringify(request.params) || id}`);

      const client = esClient.asCurrentUser.eql;

      const search = async () => {
        const { track_total_hits: _, ...defaultParams } = await getDefaultSearchParams(
          uiSettingsClient
        );
        const params = id
          ? getCommonDefaultAsyncGetParams(searchConfig, options, {
              /* disable until full eql support */ disableSearchSessions: true,
            })
          : {
              ...(await getIgnoreThrottled(uiSettingsClient)),
              ...defaultParams,
              ...getCommonDefaultAsyncGetParams(searchConfig, options, {
                /* disable until full eql support */ disableSearchSessions: true,
              }),
              ...request.params,
            };
        const response = id
          ? await client.get(
              { ...params, id },
              {
                ...request.options,
                ...options.transport,
                signal: options.abortSignal,
                meta: true,
              }
            )
          : // @ts-expect-error optional key cannot be used since search doesn't expect undefined
            await client.search(params as EqlSearchStrategyRequest['params'], {
              ...request.options,
              ...options.transport,
              signal: options.abortSignal,
              meta: true,
            });

        return toEqlKibanaSearchResponse(
          response as TransportResult<EqlSearchResponse>,
          // do not return requestParams on polling calls
          id ? undefined : (response as TransportResult<EqlSearchResponse>).meta?.request?.params
        );
      };

      const cancel = async () => {
        if (!id) return;
        try {
          await cancelAsyncSearch(id, esClient);
        } catch (e) {
          // A 404 means either this search request does not exist, or that it is already cancelled
          if (e.meta?.statusCode === 404) return;

          // Log all other (unexpected) error messages
          logger.error(`cancelEqlSearch error: ${e.message}`);
        }
      };

      return pollSearch(search, cancel, {
        pollInterval: searchConfig.asyncSearch.pollInterval,
        ...options,
      }).pipe(tap((response) => (id = response.id)));
    },

    extend: async (id, keepAlive, options, { esClient }) => {
      logger.debug(`_eql/extend ${id} by ${keepAlive}`);
      await esClient.asCurrentUser.eql.get({ id, keep_alive: keepAlive });
    },
  };
};
