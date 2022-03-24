/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { tap } from 'rxjs/operators';
import { omit } from 'lodash';
import type { Observable } from 'rxjs';
import { DataViewsService } from '../../../../../../data_views/common';
import { toSanitizedFieldType } from '../../../../common/fields_utils';

import type { FetchedIndexPattern, TrackedEsSearches } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';

export interface EsSearchRequest {
  body: Record<string, any>;
  index?: string;
  trackingEsSearchMeta?: {
    requestId: string;
    requestLabel?: string;
  };
}

function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());
  return controller.signal;
}

export abstract class AbstractSearchStrategy {
  async search(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    esRequests: EsSearchRequest[],
    trackedEsSearches?: TrackedEsSearches,
    indexType?: string
  ) {
    const requests: any[] = [];

    // User may abort the request without waiting for the results
    // we need to handle this scenario by aborting underlying server requests
    const abortSignal = getRequestAbortedSignal(req.events.aborted$);

    esRequests.forEach(({ body, index, trackingEsSearchMeta }) => {
      const startTime = Date.now();
      requests.push(
        requestContext.search
          .search(
            {
              indexType,
              params: {
                body,
                index,
              },
            },
            { ...req.body.searchSession, abortSignal }
          )
          .pipe(
            tap((data) => {
              if (trackingEsSearchMeta?.requestId && trackedEsSearches) {
                trackedEsSearches[trackingEsSearchMeta.requestId] = {
                  body,
                  time: Date.now() - startTime,
                  label: trackingEsSearchMeta.requestLabel,
                  response: omit(data.rawResponse, 'aggregations'),
                };
              }
            })
          )
          .toPromise()
      );
    });

    return Promise.all(requests);
  }

  checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    fetchedIndexPattern: FetchedIndexPattern
  ): Promise<{ isViable: boolean; capabilities: any }> {
    throw new TypeError('Must override method');
  }

  async getFieldsForWildcard(
    fetchedIndexPattern: FetchedIndexPattern,
    indexPatternsService: DataViewsService,
    capabilities?: unknown,
    options?: Partial<{
      type: string;
      rollupIndex: string;
    }>
  ) {
    return toSanitizedFieldType(
      fetchedIndexPattern.indexPattern
        ? fetchedIndexPattern.indexPattern.getNonScriptedFields()
        : await indexPatternsService.getFieldsForWildcard({
            pattern: fetchedIndexPattern.indexPatternString ?? '',
            metaFields: [],
            ...options,
          })
    );
  }
}
