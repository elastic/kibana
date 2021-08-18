/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import { Adapters } from '../../../../../../inspector/common';
import { isCompleteResponse, SearchSource } from '../../../../../../data/common';
import { FetchStatus } from '../../../types';
import { SavedSearchData } from '../services/use_saved_search';
import { sendErrorMsg, sendLoadingMsg } from '../services/use_saved_search_messages';
import { SAMPLE_SIZE_SETTING } from '../../../../../common';
import { DiscoverServices } from '../../../../build_services';

export const fetchDocuments = (
  data$: SavedSearchData,
  searchSource: SearchSource,
  {
    abortController,
    inspectorAdapters,
    onResults,
    searchSessionId,
    services,
  }: {
    abortController: AbortController;
    inspectorAdapters: Adapters;
    onResults: (foundDocuments: boolean) => void;
    searchSessionId: string;
    services: DiscoverServices;
  }
) => {
  const { documents$, totalHits$ } = data$;

  searchSource.setField('size', services.uiSettings.get(SAMPLE_SIZE_SETTING));
  searchSource.setField('trackTotalHits', false);
  searchSource.setField('highlightAll', true);
  searchSource.setField('version', true);

  sendLoadingMsg(documents$);

  const executionContext = {
    type: 'application',
    name: 'discover',
    description: 'fetch documents',
    url: window.location.pathname,
    id: '',
  };

  const fetch$ = searchSource
    .fetch$({
      abortSignal: abortController.signal,
      sessionId: searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: i18n.translate('discover.inspectorRequestDataTitleDocuments', {
          defaultMessage: 'Documents',
        }),
        description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
          defaultMessage: 'This request queries Elasticsearch to fetch the documents.',
        }),
      },
      executionContext,
    })
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      const documents = res.rawResponse.hits.hits;

      // If the total hits query is still loading for hits, emit a partial
      // hit count that's at least our document count
      if (totalHits$.getValue().fetchStatus === FetchStatus.LOADING) {
        totalHits$.next({
          fetchStatus: FetchStatus.PARTIAL,
          result: documents.length,
        });
      }

      documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: documents,
      });
      onResults(documents.length > 0);
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      sendErrorMsg(documents$, error);
    }
  );
  return fetch$;
};
