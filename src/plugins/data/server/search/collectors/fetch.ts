/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { SharedGlobalConfig } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { CollectedUsage, ReportedUsage } from './register';
interface SearchTelemetry {
  'search-telemetry': CollectedUsage;
}
type ESResponse = SearchResponse<SearchTelemetry>;

export function fetchProvider(config$: Observable<SharedGlobalConfig>) {
  return async ({ esClient }: CollectorFetchContext): Promise<ReportedUsage> => {
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
    const { successCount, errorCount, totalDuration } = esResponse.hits.hits[0]._source[
      'search-telemetry'
    ];
    const averageDuration = totalDuration / successCount;
    return { successCount, errorCount, averageDuration };
  };
}
