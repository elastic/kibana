/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { normalizeSortRequest } from '@kbn/data-plugin/common';
import { IEsSearchResponse, ISearchSource } from '@kbn/data-plugin/public';
import { forkJoin, Observable } from 'rxjs';
import { LogExplorerPosition } from '../types';

export const fetchEntriesAround =
  ({ searchSource }: { searchSource: ISearchSource }) =>
  ({
    position,
  }: {
    position: LogExplorerPosition;
  }): Observable<{ before: IEsSearchResponse; after: IEsSearchResponse }> => {
    const forwardSort = normalizeSortRequest(searchSource.getField('sort'));
    const backwardSort = invertSort(forwardSort);
    // TODO: create and use point-in-time
    const beforeResponse$ = searchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(position))
      .setField('sort', backwardSort)
      .fetch$();
    const afterResponse$ = searchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(getPredecessorPosition(position)))
      .setField('sort', forwardSort)
      .fetch$();

    return forkJoin({
      before: beforeResponse$,
      after: afterResponse$,
    });
  };

const getCursorFromPosition = (
  position: LogExplorerPosition
): [string | number, string | number] => [position.timestamp, position.tiebreaker];

const getPredecessorPosition = (position: LogExplorerPosition): LogExplorerPosition => ({
  ...position,
  tiebreaker: position.tiebreaker - 1,
});

const invertSort = (sort: any) => {};
