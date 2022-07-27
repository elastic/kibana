/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { catchError, last, map, Observable, of } from 'rxjs';
import { assign } from 'xstate';
import {
  fetchEntriesAround,
  FetchEntriesAroundParameters,
} from '../../queries/fetch_entries_around';
import { LogExplorerChunk, LogExplorerCursorRT, LogExplorerEntry } from '../../types';
import {
  getPositionFromCursor,
  getPositionFromTimestamp,
  getPredecessorPosition,
} from '../../utils/cursor';
import { decodeOrThrow } from '../../utils/runtime_types';
import { LogExplorerContext, LogExplorerEvent } from './state_machine';

export type LoadAroundEvent =
  | {
      type: 'loadAroundSucceeded';
      requestParameters: FetchEntriesAroundParameters;
      beforeResponse: IEsSearchResponse;
      afterResponse: IEsSearchResponse;
    }
  | {
      type: 'loadAroundFailed';
      requestParameters: FetchEntriesAroundParameters;
      error: unknown;
    };

export const loadAround = ({
  dataView,
  query,
  searchSource,
}: {
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesAround = fetchEntriesAround({ dataView, query, searchSource });

  return (context: LogExplorerContext): Observable<LoadAroundEvent> => {
    // console.log(searchSource.getSearchRequestBody());
    const { position, timeRange } = context;

    const requestParameters: FetchEntriesAroundParameters = {
      chunkSize: 100,
      position,
      sorting: [
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
    };

    return boundFetchEntriesAround(requestParameters).pipe(
      last(),
      map(({ beforeResponse, afterResponse }) => {
        return {
          type: 'loadAroundSucceeded' as const,
          requestParameters,
          beforeResponse,
          afterResponse,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadAroundFailed' as const,
          requestParameters,
          error: err,
        });
      })
    );
  };
};

export const updateChunksFromLoadAround = assign(
  (context: LogExplorerContext, event: LogExplorerEvent) => {
    if (event.type !== 'loadAroundSucceeded') {
      return context;
    }

    const topChunk = createTopChunkFromResponse(event.requestParameters, event.beforeResponse);
    const bottomChunk = createBottomChunkFromResponse(event.requestParameters, event.afterResponse);

    return {
      ...context,
      topChunk,
      bottomChunk,
    };
  }
);

export const createTopChunkFromResponse = (
  requestParameters: FetchEntriesAroundParameters,
  response: IEsSearchResponse
): LogExplorerChunk => {
  const hits = response.rawResponse.hits.hits;
  const endPosition = requestParameters.position;

  if (hits.length <= 0) {
    return {
      status: 'empty',
      startPosition: getPositionFromTimestamp(requestParameters.timeRange.from),
      endPosition: requestParameters.position,
      chunkSize: requestParameters.chunkSize,
    };
  }

  const firstHit = hits[0];

  return {
    status: 'loaded',
    startPosition: getPositionFromCursor(getCursorFromHitSort(firstHit.sort)),
    endPosition,
    entries: hits.map(getEntryFromHit).reverse(),
    chunkSize: requestParameters.chunkSize,
  };
};

export const createBottomChunkFromResponse = (
  requestParameters: FetchEntriesAroundParameters,
  response: IEsSearchResponse
): LogExplorerChunk => {
  const hits = response.rawResponse.hits.hits;
  const startPosition = getPredecessorPosition(requestParameters.position);

  if (hits.length <= 0) {
    return {
      status: 'empty',
      startPosition,
      endPosition: getPositionFromTimestamp(requestParameters.timeRange.to),
      chunkSize: requestParameters.chunkSize,
    };
  }

  const lastHit = hits[hits.length - 1];

  return {
    status: 'loaded',
    startPosition,
    endPosition: getPositionFromCursor(getCursorFromHitSort(lastHit.sort)),
    entries: hits.map(getEntryFromHit),
    chunkSize: requestParameters.chunkSize,
  };
};

const getCursorFromHitSort = decodeOrThrow(LogExplorerCursorRT);
const getEntryFromHit = (searchHit: SearchHit): LogExplorerEntry => ({
  position: getPositionFromCursor(getCursorFromHitSort(searchHit.sort)),
  fields: searchHit.fields ?? {},
});
