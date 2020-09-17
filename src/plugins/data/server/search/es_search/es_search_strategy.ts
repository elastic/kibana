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
import { first } from 'rxjs/operators';
import { SharedGlobalConfig, Logger } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import { ApiResponse } from '@elastic/elasticsearch';
import { SearchUsage } from '../collectors/usage';
import { ISearchStrategy, getDefaultSearchParams, getTotalLoaded } from '..';

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  return {
    search: async (context, request, options) => {
      logger.debug(`search ${request.params?.index}`);
      const config = await config$.pipe(first()).toPromise();
      const defaultParams = getDefaultSearchParams(config);

      // Only default index pattern type is supported here.
      // See data_enhanced for other type support.
      if (!!request.indexType) {
        throw new Error(`Unsupported index pattern type ${request.indexType}`);
      }

      const params = {
        ...defaultParams,
        ...request.params,
      };

      try {
        const esResponse = (await context.core.elasticsearch.client.asCurrentUser.search(
          params
        )) as ApiResponse<SearchResponse<any>>;
        const rawResponse = esResponse.body;

        if (usage) usage.trackSuccess(rawResponse.took);

        // The above query will either complete or timeout and throw an error.
        // There is no progress indication on this api.
        return {
          isPartial: false,
          isRunning: false,
          rawResponse,
          ...getTotalLoaded(rawResponse._shards),
        };
      } catch (e) {
        if (usage) usage.trackError();
        throw e;
      }
    },
  };
};
