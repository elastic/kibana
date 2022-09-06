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
  fetchEntriesBefore,
  FetchEntriesBeforeParameters,
} from '../../../queries/fetch_entries_before';
import { LogExplorerChunk } from '../../../types';
import {
  getCursorFromHitSort,
  getPositionFromCursor,
  getPositionFromTimestamp,
  getPredecessorPosition,
} from '../../../utils/cursor';
import { getEntryFromHit } from '../../../utils/entry';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export type LoadBeforeParameters = FetchEntriesBeforeParameters & {
  topEndRowIndex: number;
};

export type LoadBeforeEvent =
  | {
      type: 'loadBeforeSucceeded';
      requestParameters: LoadBeforeParameters;
      response: IEsSearchResponse;
    }
  | {
      type: 'loadBeforeFailed';
      requestParameters: LoadBeforeParameters;
      error: unknown;
    };

export const loadBefore = ({
  dataView,
  query: queryService,
  searchSource,
}: {
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesBefore = fetchEntriesBefore({
    dataView,
    query: queryService,
    searchSource,
  });

  return (context: EntriesMachineContext): Observable<LoadBeforeEvent> => {
    const {
      configuration: { chunkSize },
      filters,
      query,
      timeRange,
      topChunk,
    } = context;

    if (topChunk.status !== 'loading-top' && topChunk.status !== 'loaded') {
      return throwError(
        () =>
          new Error(
            `Expected top chunk to have status "loading-top" or "loaded, but found "${topChunk.status}"`
          )
      );
    }

    const fetchBeforeRequestParamters: FetchEntriesBeforeParameters = {
      chunkSize,
      beforeEndPosition: topChunk.endPosition,
      sortCriteria: [
        // TODO: don't hard-code this
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
      filters,
      query,
    };

    const eventRequestParameters: LoadBeforeParameters = {
      ...fetchBeforeRequestParamters,
      topEndRowIndex: topChunk.endRowIndex,
    };

    return boundFetchEntriesBefore(fetchBeforeRequestParamters).pipe(
      last(),
      map((response) => {
        return {
          type: 'loadBeforeSucceeded' as const,
          requestParameters: eventRequestParameters,
          response,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadBeforeFailed' as const,
          requestParameters: eventRequestParameters,
          error: err,
        });
      })
    );
  };
};

export const updateChunksFromLoadBefore = assign(
  (context: EntriesMachineContext, event: EntriesMachineEvent) => {
    if (event.type !== 'loadBeforeSucceeded') {
      return context;
    }

    const topChunk = createTopChunkFromResponse(event.requestParameters, event.response);

    return {
      ...context,
      topChunk,
    };
  }
);

export const createTopChunkFromResponse = (
  requestParameters: LoadBeforeParameters,
  response: IEsSearchResponse
): LogExplorerChunk => {
  const {
    chunkSize,
    beforeEndPosition: endPosition,
    timeRange,
    topEndRowIndex,
  } = requestParameters;
  const hits = [...response.rawResponse.hits.hits].reverse();

  if (hits.length <= 0) {
    return {
      status: 'empty',
      startPosition: getPositionFromTimestamp(timeRange.from),
      endPosition,
      chunkSize,
      rowIndex: topEndRowIndex,
    };
  }

  const firstHit = hits[0];

  return {
    status: 'loaded',
    startPosition: getPositionFromCursor(getCursorFromHitSort(firstHit.sort)),
    endPosition,
    entries: hits.map(getEntryFromHit),
    chunkSize,
    startRowIndex: topEndRowIndex - (hits.length - 1),
    endRowIndex: topEndRowIndex,
  };
};

export const prependNewTopChunk = assign(
  (context: EntriesMachineContext, _event: EntriesMachineEvent) => {
    const { topChunk, bottomChunk } = context;

    if (topChunk.status !== 'loaded' || bottomChunk.status !== 'loaded') {
      throw new Error(
        `Expected both chunks to have status "loaded", but found "${topChunk.status}" and "${bottomChunk.status}".`
      );
    }

    const newTopChunk: LogExplorerChunk = {
      status: 'loading-top',
      chunkSize: context.configuration.chunkSize,
      endPosition: getPredecessorPosition(topChunk.startPosition),
      startRowIndex: topChunk.startRowIndex - 1,
      endRowIndex: topChunk.startRowIndex - 1,
    };

    return {
      ...context,
      topChunk: newTopChunk,
      bottomChunk: topChunk,
    };
  }
);
