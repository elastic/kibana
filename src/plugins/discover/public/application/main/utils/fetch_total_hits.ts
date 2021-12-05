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
  ISearchSource,
} from '../../../../../data/public';
import { DataViewType } from '../../../../../data_views/common';
import { Adapters } from '../../../../../inspector/common';
import { FetchStatus } from '../../types';
import { SavedSearchData } from './use_saved_search';
import { sendErrorMsg, sendLoadingMsg } from './use_saved_search_messages';

export function fetchTotalHits(
  data$: SavedSearchData,
  searchSource: ISearchSource,
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
  searchSource.setField('trackTotalHits', true);
  searchSource.setField('size', 0);
  searchSource.removeField('sort');
  searchSource.removeField('fields');
  searchSource.removeField('aggs');
  if (searchSource.getField('index')?.type === DataViewType.ROLLUP) {
    // We treat that index pattern as "normal" even if it was a rollup index pattern,
    // since the rollup endpoint does not support querying individual documents, but we
    // can get them from the regular _search API that will be used if the index pattern
    // not a rollup index pattern.
    searchSource.setOverwriteDataViewType(undefined);
  }

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
