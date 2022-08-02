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
} from '../../queries/fetch_entries_before';
import { LogExplorerChunk } from '../../types';
import {
  getCursorFromHitSort,
  getPositionFromCursor,
  getPositionFromTimestamp,
  getPredecessorPosition,
} from '../../utils/cursor';
import { getEntryFromHit } from '../../utils/entry';
import { LogExplorerContext, LogExplorerEvent } from './types';

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
  query,
  searchSource,
}: {
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesBefore = fetchEntriesBefore({ dataView, query, searchSource });

  return (context: LogExplorerContext): Observable<LoadBeforeEvent> => {
    const {
      configuration: { chunkSize },
      timeRange,
      topChunk,
    } = context;

    if (topChunk.status !== 'loading-top') {
      return throwError(
        () =>
          new Error(
            `Expected top chunk to have status "loading-top", but found "${topChunk.status}"`
          )
      );
    }

    const fetchBeforeRequestParamters: FetchEntriesBeforeParameters = {
      chunkSize,
      position: topChunk.endPosition,
      sorting: [
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
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
  (context: LogExplorerContext, event: LogExplorerEvent) => {
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
  const hits = response.rawResponse.hits.hits;
  const endPosition = requestParameters.position;

  if (hits.length <= 0) {
    const startPosition = getPredecessorPosition(
      getPositionFromTimestamp(requestParameters.timeRange.from)
    );

    return {
      status: 'empty',
      startPosition,
      endPosition,
      chunkSize: requestParameters.chunkSize,
      rowIndex: requestParameters.topEndRowIndex,
    };
  }

  const firstHit = hits[0];
  const startPosition = getPredecessorPosition(
    getPositionFromCursor(getCursorFromHitSort(firstHit.sort))
  );

  return {
    status: 'loaded',
    startPosition,
    endPosition,
    entries: hits.map(getEntryFromHit).reverse(),
    chunkSize: requestParameters.chunkSize,
    startRowIndex: requestParameters.topEndRowIndex - (hits.length - 1),
    endRowIndex: requestParameters.topEndRowIndex,
  };
};

export const prependNewTopChunk = assign(
  (context: LogExplorerContext, _event: LogExplorerEvent) => {
    const { topChunk, bottomChunk } = context;

    if (topChunk.status !== 'loaded' || bottomChunk.status !== 'loaded') {
      throw new Error(
        `Expected both chunks to have status "loaded", but found "${topChunk.status}" and "${bottomChunk.status}".`
      );
    }

    const newTopChunk: LogExplorerChunk = {
      status: 'loading-top',
      chunkSize: context.configuration.chunkSize,
      endPosition: topChunk.startPosition,
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
