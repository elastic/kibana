/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { catchError, last, map, Observable, of, throwError } from 'rxjs';
import { assign } from 'xstate';
import {
  fetchEntriesAfter,
  FetchEntriesAfterParameters,
} from '../../../queries/fetch_entries_after';
import { LogExplorerChunk } from '../../../types';
import {
  getCursorFromHitSort,
  getPositionFromCursor,
  getPositionFromTimestamp,
  getSuccessorPosition,
} from '../../../utils/cursor';
import { getEntryFromHit } from '../../../utils/entry';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export type LoadAfterParameters = FetchEntriesAfterParameters & {
  bottomStartRowIndex: number;
};

export type LoadAfterEvent =
  | {
      type: 'loadAfterSucceeded';
      requestParameters: LoadAfterParameters;
      response: IEsSearchResponse;
    }
  | {
      type: 'loadAfterFailed';
      requestParameters: LoadAfterParameters;
      error: unknown;
    };

export const loadAfter = ({
  dataView,
  query: queryService,
  searchSource,
}: {
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesAfter = fetchEntriesAfter({ dataView, query: queryService, searchSource });

  return (context: EntriesMachineContext): Observable<LoadAfterEvent> => {
    const {
      bottomChunk,
      configuration: { chunkSize },
      filters,
      query,
      timeRange,
    } = context;

    if (bottomChunk.status !== 'loading-bottom' && bottomChunk.status !== 'loaded') {
      return throwError(
        () =>
          new Error(
            `Expected bottom chunk to have status "loading-bottom" or "loaded", but found "${bottomChunk.status}"`
          )
      );
    }

    const fetchAfterRequestParamters: FetchEntriesAfterParameters = {
      chunkSize,
      afterStartPosition: bottomChunk.startPosition,
      sortCriteria: [
        // TODO: don't hard-code this
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
      filters,
      query,
    };

    const eventRequestParameters: LoadAfterParameters = {
      ...fetchAfterRequestParamters,
      bottomStartRowIndex: bottomChunk.startRowIndex,
    };

    return boundFetchEntriesAfter(fetchAfterRequestParamters).pipe(
      last(),
      map((response) => {
        return {
          type: 'loadAfterSucceeded' as const,
          requestParameters: eventRequestParameters,
          response,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadAfterFailed' as const,
          requestParameters: eventRequestParameters,
          error: err,
        });
      })
    );
  };
};

export const updateChunksFromLoadAfter = assign(
  (context: EntriesMachineContext, event: EntriesMachineEvent) => {
    if (event.type !== 'loadAfterSucceeded') {
      return context;
    }

    const bottomChunk = createBottomChunkFromResponse(event.requestParameters, event.response);

    return {
      ...context,
      bottomChunk,
    };
  }
);

export const createBottomChunkFromResponse = (
  requestParameters: LoadAfterParameters,
  response: IEsSearchResponse
): LogExplorerChunk => {
  const {
    bottomStartRowIndex,
    chunkSize,
    afterStartPosition: startPosition,
    timeRange,
  } = requestParameters;
  const hits = response.rawResponse.hits.hits;

  if (hits.length <= 0) {
    return {
      status: 'empty',
      startPosition,
      endPosition: getPositionFromTimestamp(timeRange.to),
      chunkSize,
      rowIndex: bottomStartRowIndex,
    };
  }

  const lastHit = hits[hits.length - 1];

  return {
    status: 'loaded',
    startPosition,
    endPosition: getPositionFromCursor(getCursorFromHitSort(lastHit.sort)),
    entries: hits.map(getEntryFromHit),
    chunkSize,
    startRowIndex: bottomStartRowIndex,
    endRowIndex: bottomStartRowIndex + (hits.length - 1),
  };
};

export const appendNewBottomChunk = assign(
  (context: EntriesMachineContext, _event: EntriesMachineEvent) => {
    const { topChunk, bottomChunk } = context;

    if (topChunk.status !== 'loaded' || bottomChunk.status !== 'loaded') {
      throw new Error(
        `Expected both chunks to have status "loaded", but found "${topChunk.status}" and "${bottomChunk.status}".`
      );
    }

    const newBottomChunk: LogExplorerChunk = {
      status: 'loading-bottom',
      chunkSize: context.configuration.chunkSize,
      startPosition: getSuccessorPosition(bottomChunk.endPosition),
      startRowIndex: bottomChunk.endRowIndex + 1,
      endRowIndex: bottomChunk.endRowIndex + 1,
    };

    return {
      ...context,
      topChunk: bottomChunk,
      bottomChunk: newBottomChunk,
    };
  }
);
