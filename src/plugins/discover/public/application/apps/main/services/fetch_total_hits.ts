/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  SearchSource,
} from '../../../../../../data/public';
import { Adapters } from '../../../../../../inspector/common';
import { FetchStatus } from '../../../types';
import { SavedSearchTotalHitsSubject } from './use_saved_search';

export function fetchTotalHits(
  dataTotalHits$: SavedSearchTotalHitsSubject,
  {
    abortController,
    data,
    inspectorAdapters,
    onResults,
    searchSessionId,
    searchSource,
  }: {
    abortController: AbortController;
    data: DataPublicPluginStart;
    onResults: (isEmpty: boolean) => void;
    inspectorAdapters: Adapters;
    searchSessionId: string;
    searchSource: SearchSource;
  }
) {
  const childSearchSource = searchSource.createCopy();
  const indexPattern = searchSource.getField('index');
  childSearchSource.setField('trackTotalHits', true);
  childSearchSource.setField(
    'filter',
    data.query.timefilter.timefilter.createFilter(indexPattern!)
  );
  childSearchSource.setField('size', 0);

  const fetch$ = childSearchSource
    .fetch$({
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('discover.inspectorRequestDataTitleTotalHits', {
          defaultMessage: 'Total hits',
        }),
        description: i18n.translate('discover.inspectorRequestDescriptionTotalHits', {
          defaultMessage: 'This request queries Elasticsearch to fetch the total hits.',
        }),
      },
      abortSignal: abortController.signal,
      sessionId: searchSessionId,
    })
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      const totalHitsNr = res.rawResponse.hits.total as number;
      dataTotalHits$.next({ fetchStatus: FetchStatus.COMPLETE, result: totalHitsNr });
      onResults(totalHitsNr === 0);
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dataTotalHits$.next({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
    }
  );

  return fetch$;
}
