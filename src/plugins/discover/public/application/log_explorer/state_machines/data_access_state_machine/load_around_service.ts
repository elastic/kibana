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
import { LogExplorerContext, LogExplorerEvent } from './types';

export type LoadAroundParameters = FetchEntriesAroundParameters & {
  centerRowIndex: number;
};

export type LoadAroundEvent =
  | {
      type: 'loadAroundSucceeded';
      requestParameters: LoadAroundParameters;
      beforeResponse: IEsSearchResponse;
      afterResponse: IEsSearchResponse;
    }
  | {
      type: 'loadAroundFailed';
      requestParameters: LoadAroundParameters;
      error: unknown;
    };

export const loadAround = ({
  centerRowIndex,
  dataView,
  query,
  searchSource,
}: {
  centerRowIndex: number;
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesAround = fetchEntriesAround({ dataView, query, searchSource });

  return (context: LogExplorerContext): Observable<LoadAroundEvent> => {
    // console.log(searchSource.getSearchRequestBody());
    const {
      configuration: { chunkSize },
      position,
      timeRange,
    } = context;

    const fetchAroundRequestParamters: FetchEntriesAroundParameters = {
      chunkSize,
      position,
      sorting: [
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
    };

    const eventRequestParameters: LoadAroundParameters = {
      ...fetchAroundRequestParamters,
      centerRowIndex,
    };

    return boundFetchEntriesAround(fetchAroundRequestParamters).pipe(
      last(),
      map(({ beforeResponse, afterResponse }) => {
        return {
          type: 'loadAroundSucceeded' as const,
          requestParameters: eventRequestParameters,
          beforeResponse,
          afterResponse,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadAroundFailed' as const,
          requestParameters: eventRequestParameters,
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
  requestParameters: LoadAroundParameters,
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
      rowIndex: requestParameters.centerRowIndex - 1,
    };
  }

  const firstHit = hits[0];

  return {
    status: 'loaded',
    startPosition: getPositionFromCursor(getCursorFromHitSort(firstHit.sort)),
    endPosition,
    entries: hits.map(getEntryFromHit).reverse(),
    chunkSize: requestParameters.chunkSize,
    rowIndex: requestParameters.centerRowIndex - hits.length,
  };
};

export const createBottomChunkFromResponse = (
  requestParameters: LoadAroundParameters,
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
      rowIndex: requestParameters.centerRowIndex,
    };
  }

  const lastHit = hits[hits.length - 1];

  return {
    status: 'loaded',
    startPosition,
    endPosition: getPositionFromCursor(getCursorFromHitSort(lastHit.sort)),
    entries: hits.map(getEntryFromHit),
    chunkSize: requestParameters.chunkSize,
    rowIndex: requestParameters.centerRowIndex,
  };
};

const getCursorFromHitSort = decodeOrThrow(LogExplorerCursorRT);
const getEntryFromHit = (searchHit: SearchHit): LogExplorerEntry => ({
  position: getPositionFromCursor(getCursorFromHitSort(searchHit.sort)),
  fields: searchHit.fields ?? {},
});
