/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { DataPublicPluginStart } from '../../../../../data/public';
import { SavedSearch } from '../../../saved_searches';

export type TotalHitsSubject = BehaviorSubject<{ state: string; total?: number }>;

export function useTotalHits({
  savedSearch,
  data,
}: {
  savedSearch: SavedSearch;
  data: DataPublicPluginStart;
}) {
  const subject: TotalHitsSubject = useMemo(() => new BehaviorSubject({ state: 'initial' }), []);

  const fetchData = useCallback(
    (abortController: AbortController, searchSessionId: string) => {
      const searchSource = savedSearch.searchSource.createChild();
      const indexPattern = savedSearch.searchSource.getField('index');
      searchSource.setField('trackTotalHits', true);
      searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
      searchSource.setField('size', 0);
      subject.next({ state: 'loading' });

      return searchSource
        .fetch$({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
        })
        .subscribe({
          next: (result) => {
            subject.next({ state: 'success', total: result.hits.total as number });
            return result.hits.total;
          },
          error: (error) => {
            if (error instanceof Error && error.name === 'AbortError') return;
            return error;
          },
        });
    },
    [data, savedSearch.searchSource, subject]
  );

  return { fetch$: subject, fetch: fetchData };
}
