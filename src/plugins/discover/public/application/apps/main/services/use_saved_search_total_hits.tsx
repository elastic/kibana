/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { SavedSearch } from '../../../../saved_searches';
import { DataPublicPluginStart } from '../../../../../../data/public';
import { fetchStatuses } from '../../../components/constants';
import { Adapters } from '../../../../../../inspector/common';

export type TotalHitsSubject = BehaviorSubject<{ state: string; total?: number }>;

export function useSavedSearchTotalHits({
  savedSearch,
  data,
}: {
  savedSearch: SavedSearch;
  data: DataPublicPluginStart;
}) {
  const subject: TotalHitsSubject = useMemo(
    () => new BehaviorSubject({ state: fetchStatuses.UNINITIALIZED }),
    []
  );

  const fetchData = useCallback(
    ({
      abortController,
      searchSessionId,
      inspectorAdapters,
    }: {
      abortController: AbortController;
      searchSessionId: string;
      inspectorAdapters: Adapters;
    }) => {
      const searchSource = savedSearch.searchSource.createChild();
      const indexPattern = savedSearch.searchSource.getField('index');
      searchSource.setField('trackTotalHits', true);
      searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
      searchSource.setField('size', 0);
      subject.next({ state: fetchStatuses.LOADING });

      const searchSourceFetch$ = searchSource.fetch$({
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitleTotalHits', {
            defaultMessage: 'total hits data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionTotalHits', {
            defaultMessage:
              'This request queries Elasticsearch to fetch the total hits number for the search.',
          }),
        },
        abortSignal: abortController.signal,
        sessionId: searchSessionId,
      });

      searchSourceFetch$.subscribe({
        next: ({ rawResponse }) => {
          subject.next({ state: fetchStatuses.COMPLETE, total: rawResponse.hits.total as number });
          return rawResponse.hits.total;
        },
      });
      return searchSourceFetch$;
    },
    [data, savedSearch.searchSource, subject]
  );

  return { fetch$: subject, fetch: fetchData };
}
