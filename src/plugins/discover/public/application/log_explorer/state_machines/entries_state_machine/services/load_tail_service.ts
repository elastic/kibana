/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { catchError, last, map, Observable, of } from 'rxjs';
import { assign } from 'xstate';
import {
  fetchEntriesBefore,
  FetchEntriesBeforeParameters,
} from '../../../queries/fetch_entries_before';
import { LogExplorerChunk, LogExplorerEntry } from '../../../types';
import { getPositionFromTimestamp, getPredecessorPosition } from '../../../utils/cursor';
import { getEntriesFromChunk, getEntryFromHit, countAddedEntries } from '../../../utils/entry';
import { getEndRowIndex, getStartRowIndex } from '../../../utils/row';
import { EntriesMachineContext, EntriesMachineEvent } from '../types';

export type LoadTailParameters = FetchEntriesBeforeParameters;

export type LoadTailEvent =
  | {
      type: 'loadTailSucceeded';
      requestParameters: LoadTailParameters;
      response: IEsSearchResponse;
    }
  | {
      type: 'loadTailFailed';
      requestParameters: LoadTailParameters;
      error: unknown;
    };

export const loadTail = ({
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

  return (context: EntriesMachineContext): Observable<LoadTailEvent> => {
    const {
      configuration: { chunkSize },
      filters,
      query,
      timeRange,
    } = context;

    const fetchBeforeRequestParamters: FetchEntriesBeforeParameters = {
      chunkSize: chunkSize * 2,
      beforeEndPosition: getPositionFromTimestamp(timeRange.to),
      sortCriteria: [
        // TODO: don't hard-code this
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
      filters,
      query,
    };

    return boundFetchEntriesBefore(fetchBeforeRequestParamters).pipe(
      last(),
      map((response) => {
        return {
          type: 'loadTailSucceeded' as const,
          requestParameters: fetchBeforeRequestParamters,
          response,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadTailFailed' as const,
          requestParameters: fetchBeforeRequestParamters,
          error: err,
        });
      })
    );
  };
};

export const updateChunksFromLoadTail = assign(
  (context: EntriesMachineContext, event: EntriesMachineEvent) => {
    if (event.type !== 'loadTailSucceeded') {
      return context;
    }

    const { configuration, topChunk, bottomChunk } = context;
    const { requestParameters, response } = event;

    const newHits = [...response.rawResponse.hits.hits].reverse();
    const newEntries = newHits.map(getEntryFromHit);

    if (newEntries.length <= 0) {
      return context;
    }

    const previousTopEntries = getEntriesFromChunk(topChunk);
    const previousBottomEntries = getEntriesFromChunk(bottomChunk);
    const previousEntries = [...previousTopEntries, ...previousBottomEntries];
    const addedEntriesCount = countAddedEntries(previousEntries, newEntries);
    const newTopEntries = newEntries.slice(-configuration.chunkSize * 2, -configuration.chunkSize);
    const newBottomEntries = newEntries.slice(-configuration.chunkSize, undefined);

    const newTopChunk = createTopChunkFromEntries(
      topChunk,
      newTopEntries,
      newBottomEntries,
      addedEntriesCount,
      requestParameters.timeRange,
      configuration.chunkSize
    );
    const newBottomChunk = createBottomChunkFromEntries(
      bottomChunk,
      newBottomEntries,
      addedEntriesCount,
      requestParameters.timeRange,
      configuration.chunkSize
    );

    return {
      ...context,
      topChunk: newTopChunk,
      bottomChunk: newBottomChunk,
    };
  }
);

const createTopChunkFromEntries = (
  previousChunk: LogExplorerChunk,
  topEntries: LogExplorerEntry[],
  bottomEntries: LogExplorerEntry[],
  addedEntriesCount: number,
  timeRange: TimeRange,
  chunkSize: number
): LogExplorerChunk => {
  if (topEntries.length <= 0) {
    const firstBottomEntry = bottomEntries[0];
    return {
      status: 'empty',
      startPosition: getPositionFromTimestamp(timeRange.from),
      endPosition: getPredecessorPosition(
        firstBottomEntry?.position ?? getPositionFromTimestamp(timeRange.to)
      ),
      chunkSize,
      rowIndex: getEndRowIndex(previousChunk),
    };
  }

  const firstEntry = topEntries[0];
  const lastEntry = topEntries[topEntries.length - 1];
  const startRowIndex = getStartRowIndex(previousChunk) + addedEntriesCount;

  return {
    status: 'loaded',
    startPosition: firstEntry.position,
    endPosition: lastEntry.position,
    chunkSize,
    startRowIndex,
    endRowIndex: startRowIndex + (topEntries.length - 1),
    entries: topEntries,
  };
};

const createBottomChunkFromEntries = (
  previousChunk: LogExplorerChunk,
  bottomEntries: LogExplorerEntry[],
  addedEntriesCount: number,
  timeRange: TimeRange,
  chunkSize: number
): LogExplorerChunk => {
  if (bottomEntries.length <= 0) {
    const position = getPositionFromTimestamp(timeRange.to);
    return {
      status: 'empty',
      startPosition: position,
      endPosition: position,
      chunkSize,
      rowIndex: getEndRowIndex(previousChunk),
    };
  }

  const firstEntry = bottomEntries[0];
  const lastEntry = bottomEntries[bottomEntries.length - 1];
  const startRowIndex = getStartRowIndex(previousChunk) + addedEntriesCount;

  return {
    status: 'loaded',
    startPosition: firstEntry.position,
    endPosition: lastEntry.position,
    chunkSize,
    startRowIndex,
    endRowIndex: startRowIndex + (bottomEntries.length - 1),
    entries: bottomEntries,
  };
};
