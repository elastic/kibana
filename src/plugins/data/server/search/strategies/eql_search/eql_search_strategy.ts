/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import { tap } from 'rxjs/operators';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
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
import { getDefaultAsyncGetParams, getIgnoreThrottled } from '../ese_search/request_utils';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  async function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    const client = esClient.asCurrentUser.eql;
    await client.delete({ id });
  }

  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      await cancelAsyncSearch(id, esClient);
    },

    search: ({ id, ...request }, options: IAsyncSearchOptions, { esClient, uiSettingsClient }) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || id}`);

      const client = esClient.asCurrentUser.eql;

      const search = async () => {
        const { track_total_hits: _, ...defaultParams } = await getDefaultSearchParams(
          uiSettingsClient
        );
        const params = id
          ? getDefaultAsyncGetParams(null, options)
          : {
              ...(await getIgnoreThrottled(uiSettingsClient)),
              ...defaultParams,
              ...getDefaultAsyncGetParams(null, options),
              ...request.params,
            };
        const response = id
          ? await client.get(
              { ...params, id },
              { ...request.options, signal: options.abortSignal, meta: true }
            )
          : // @ts-expect-error optional key cannot be used since search doesn't expect undefined
            await client.search(params as EqlSearchStrategyRequest['params'], {
              ...request.options,
              abortController: { signal: options.abortSignal },
              meta: true,
            });

        return toEqlKibanaSearchResponse(response as TransportResult<EqlSearchResponse>);
      };

      const cancel = async () => {
        if (id) {
          await cancelAsyncSearch(id, esClient);
        }
      };

      return pollSearch(search, cancel, options).pipe(tap((response) => (id = response.id)));
    },

    extend: async (id, keepAlive, options, { esClient }) => {
      logger.debug(`_eql/extend ${id} by ${keepAlive}`);
      await esClient.asCurrentUser.eql.get({ id, keep_alive: keepAlive });
    },
  };
};
