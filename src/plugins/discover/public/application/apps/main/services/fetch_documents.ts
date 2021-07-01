/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter } from 'rxjs/operators';
import { ISearchSource } from '../../../../kibana_services';
import { Adapters } from '../../../../../../inspector/common';
import { isCompleteResponse } from '../../../../../../data/common';
import { FetchStatus } from '../../../types';
import { SavedSearchDataDocumentsSubject } from './use_saved_search';

export const fetchDocuments = (
  dataDocuments$: SavedSearchDataDocumentsSubject,
  {
    abortController,
    inspectorAdapters,
    onResults,
    searchSessionId,
    searchSource,
  }: {
    abortController: AbortController;
    inspectorAdapters: Adapters;
    onResults: (isEmpty: boolean) => void;
    searchSessionId: string;
    searchSource: ISearchSource;
  }
) => {
  const childSearchSource = searchSource.createCopy();
  childSearchSource.setField('trackTotalHits', false);
  childSearchSource.setField('highlightAll', true);
  childSearchSource.setField('version', false);

  const fetch$ = childSearchSource
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
    })
    .pipe(filter((res) => isCompleteResponse(res)));

  fetch$.subscribe(
    (res) => {
      const documents = res.rawResponse.hits.hits;

      dataDocuments$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: documents,
      });
      onResults(documents.length === 0);
    },
    (error) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      dataDocuments$.next({
        fetchStatus: FetchStatus.ERROR,
        error,
      });
    }
  );
  return fetch$;
};
