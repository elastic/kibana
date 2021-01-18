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

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { SharedGlobalConfig } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { Usage } from './register';
interface SearchTelemetry {
  'search-telemetry': Usage;
}
type ESResponse = SearchResponse<SearchTelemetry>;

export function fetchProvider(config$: Observable<SharedGlobalConfig>) {
  return async ({ esClient }: CollectorFetchContext): Promise<Usage> => {
    const config = await config$.pipe(first()).toPromise();
    const { body: esResponse } = await esClient.search<ESResponse>(
      {
        index: config.kibana.index,
        body: {
          query: { term: { type: { value: 'search-telemetry' } } },
        },
      },
      { ignore: [404] }
    );
    const size = esResponse?.hits?.hits?.length ?? 0;
    if (!size) {
      return {
        successCount: 0,
        errorCount: 0,
        averageDuration: null,
      };
    }
    return esResponse.hits.hits[0]._source['search-telemetry'];
  };
}
