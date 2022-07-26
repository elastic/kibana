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
import { fetchEntriesAround } from '../../queries/fetch_entries_around';
import { LogExplorerContext, LogExplorerEvent } from '../data_access_state_machine';

export type LoadAroundEvent =
  | {
      type: 'loadAroundSucceeded';
      before: IEsSearchResponse;
      after: IEsSearchResponse;
    }
  | {
      type: 'loadAroundFailed';
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

  return (context: LogExplorerContext, event: LogExplorerEvent): Observable<LoadAroundEvent> => {
    // console.log(searchSource.getSearchRequestBody());
    const { position } = context;

    return boundFetchEntriesAround({
      position,
      sorting: [
        [dataView.timeFieldName, 'asc'],
        ['_doc', 'asc'], // _shard_doc is only available when used inside a PIT
      ],
    }).pipe(
      last(),
      map(({ before, after }) => {
        return {
          type: 'loadAroundSucceeded' as const,
          before,
          after,
        };
      }),
      catchError((err) => {
        return of({
          type: 'loadAroundFailed' as const,
          error: err,
        });
      })
    );
  };
};

// TODO: this should be named more specifically and possibly live somewhere else (model?)
export const updateChunks = assign((context: LogExplorerContext, event: LogExplorerEvent) => {
  if (event.type !== 'loadAroundSucceeded') {
    return context;
  }

  return context;
});
