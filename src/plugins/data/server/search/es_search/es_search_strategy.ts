/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { first, tap, takeUntil, map } from 'rxjs/operators';
import { SharedGlobalConfig, Logger, RequestHandlerContext } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Observable, from, NEVER } from 'rxjs';
import { SearchUsage } from '../collectors/usage';
import { toSnakeCase } from './to_snake_case';
import { toPromise, IEsSearchRequest } from '../../../common';
import { ISearchStrategy, getDefaultSearchParams, getShardTimeout } from '..';

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const runSearch = async (context: RequestHandlerContext, request: IEsSearchRequest) => {
    const config = await config$.pipe(first()).toPromise();
    const uiSettingsClient = context.core.uiSettings.client;
    // ignoreThrottled is not supported in OSS
    const { ignoreThrottled, ...defaultParams } = await getDefaultSearchParams(uiSettingsClient);

    const params = toSnakeCase({
      ...defaultParams,
      ...getShardTimeout(config),
      ...request.params,
    });

    return context.core.elasticsearch.client.asCurrentUser.search<SearchResponse<any>>(params);
  };

  return {
    search: (context, request, options) => {
      logger.debug(`search ${request.params?.index}`);

      // Only default index pattern type is supported here.
      // See data_enhanced for other type support.
      if (!!request.indexType) {
        throw new Error(`Unsupported index pattern type ${request.indexType}`);
      }

      const aborted$ = options?.abortSignal ? from(toPromise(options.abortSignal)) : NEVER;

      return from(runSearch(context, request)).pipe(
        map((response) => response.body),
        tap({
          next: (responseBody) => {
            logger.debug(`${responseBody}`);
            if (usage) usage.trackSuccess(responseBody.took);
          },
          error: (e) => {
            logger.debug(`error ${e}`);
            if (usage) usage.trackError();
          },
        }),
        map((responseBody) => ({
          isPartial: false,
          isRunning: false,
          rawResponse: responseBody,
        })),
        takeUntil(aborted$)
      );
    },
  };
};
