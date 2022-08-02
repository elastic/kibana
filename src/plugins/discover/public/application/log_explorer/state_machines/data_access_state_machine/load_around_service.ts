/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { catchError, last, map, Observable, of } from 'rxjs';
import { assign } from 'xstate';
import {
  fetchEntriesAround,
  FetchEntriesAroundParameters,
} from '../../queries/fetch_entries_around';
import { LogExplorerChunk } from '../../types';
import {
  getCursorFromHitSort,
  getPositionFromCursor,
  getPositionFromTimestamp,
  getPredecessorPosition,
} from '../../utils/cursor';
import { getEntryFromHit } from '../../utils/entry';
import { createTopChunkFromResponse } from './load_before_service';
import { LogExplorerContext, LogExplorerEvent } from './types';

export type LoadAroundParameters = FetchEntriesAroundParameters & {
  topEndRowIndex: number;
  bottomStartRowIndex: number;
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
      topEndRowIndex: centerRowIndex - 1,
      bottomStartRowIndex: centerRowIndex,
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
      rowIndex: requestParameters.bottomStartRowIndex,
    };
  }

  const lastHit = hits[hits.length - 1];

  return {
    status: 'loaded',
    startPosition,
    endPosition: getPositionFromCursor(getCursorFromHitSort(lastHit.sort)),
    entries: hits.map(getEntryFromHit),
    chunkSize: requestParameters.chunkSize,
    startRowIndex: requestParameters.bottomStartRowIndex,
    endRowIndex: requestParameters.bottomStartRowIndex + (hits.length - 1),
  };
};
