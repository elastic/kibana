/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { CollectedUsage, ReportedUsage } from './register';

interface SearchTelemetry {
  'search-telemetry': CollectedUsage;
}

export function fetchProvider(kibanaIndex: string) {
  return async ({ esClient }: CollectorFetchContext): Promise<ReportedUsage> => {
    const esResponse = await esClient.search<SearchTelemetry>(
      {
        index: kibanaIndex,
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
    const { successCount, errorCount, totalDuration } =
      esResponse.hits.hits[0]._source!['search-telemetry'];
    const averageDuration = totalDuration / successCount;
    return { successCount, errorCount, averageDuration };
  };
}
