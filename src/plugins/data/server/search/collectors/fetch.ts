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
import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { Usage } from './register';

interface SearchTelemetrySavedObject {
  'search-telemetry': Usage;
}

export function fetchProvider(config$: Observable<SharedGlobalConfig>) {
  return async ({ callCluster }: CollectorFetchContext): Promise<Usage> => {
    const config = await config$.pipe(first()).toPromise();

    const response = await callCluster<SearchTelemetrySavedObject>('search', {
      index: config.kibana.index,
      body: {
        query: { term: { type: { value: 'search-telemetry' } } },
      },
      ignore: [404],
    });

    return response.hits.hits.length
      ? response.hits.hits[0]._source['search-telemetry']
      : {
          successCount: 0,
          errorCount: 0,
          averageDuration: null,
        };
  };
}
