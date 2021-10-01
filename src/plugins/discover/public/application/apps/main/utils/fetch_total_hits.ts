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
import { SavedSearchData } from '../services/use_saved_search';
import { sendErrorMsg, sendLoadingMsg } from '../services/use_saved_search_messages';

export function fetchTotalHits(
  data$: SavedSearchData,
  searchSource: SearchSource,
  {
    abortController,
    data,
    inspectorAdapters,
    onResults,
    searchSessionId,
  }: {
    abortController: AbortController;
    data: DataPublicPluginStart;
    onResults: (foundDocuments: boolean) => void;
    inspectorAdapters: Adapters;
    searchSessionId: string;
  }
) {
  const { totalHits$ } = data$;
  const indexPattern = searchSource.getField('index');
  searchSource.setField('trackTotalHits', true);
  searchSource.setField('filter', data.query.timefilter.timefilter.createFilter(indexPattern!));
  searchSource.setField('size', 0);
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  searchSource.removeField('aggs');

  sendLoadingMsg(totalHits$);

  const executionContext = {
    type: 'application',
    name: 'discover',
    description: 'fetch total hits',
    url: window.location.pathname,
    id: '',
  };

  const fetch$ = searchSource
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
      executionContext,
    })
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      const totalHitsNr = res.rawResponse.hits.total as number;
      totalHits$.next({ fetchStatus: FetchStatus.COMPLETE, result: totalHitsNr });
      onResults(totalHitsNr > 0);
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      sendErrorMsg(totalHits$, error);
    }
  );

  return fetch$;
}
