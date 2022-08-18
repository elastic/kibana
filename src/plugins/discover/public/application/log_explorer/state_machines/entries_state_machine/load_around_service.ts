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
import { getPredecessorPosition } from '../../utils/cursor';
import { createBottomChunkFromResponse } from './services/load_after_service';
import { createTopChunkFromResponse } from './services/load_before_service';
import { EntriesMachineContext, EntriesMachineEvent } from './types';

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
  query: queryService,
  searchSource,
}: {
  centerRowIndex: number;
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const boundFetchEntriesAround = fetchEntriesAround({
    dataView,
    query: queryService,
    searchSource,
  });

  return (context: EntriesMachineContext): Observable<LoadAroundEvent> => {
    // console.log(searchSource.getSearchRequestBody());
    const {
      configuration: { chunkSize },
      filters,
      position,
      query,
      timeRange,
    } = context;

    const fetchAroundRequestParamters: FetchEntriesAroundParameters = {
      chunkSize,
      afterStartPosition: position,
      beforeEndPosition: getPredecessorPosition(position),
      sortCriteria: [
        // TODO: don't hard-code this
        [dataView.timeFieldName!, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
      timeRange,
      filters,
      query,
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
  (context: EntriesMachineContext, event: EntriesMachineEvent) => {
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
