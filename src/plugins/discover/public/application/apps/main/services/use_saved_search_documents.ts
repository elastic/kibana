/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { IndexPattern, ISearchSource } from '../../../../kibana_services';
import { updateSearchSource } from '../utils/update_search_source';
import { DiscoverServices } from '../../../../build_services';
import { GetStateReturn } from './discover_state';
import { SortOrder } from '../../../../saved_searches/types';
import { Adapters } from '../../../../../../inspector/common';
import { fetchStatuses } from '../../../components/constants';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';

export type DocumentSubject = BehaviorSubject<{ state: string; documents?: ElasticSearchHit[] }>;

export function useSavedSearchDocuments({
  indexPattern,
  services,
  stateContainer,
  useNewFieldsApi,
  searchSource,
}: {
  services: DiscoverServices;
  indexPattern: IndexPattern;
  useNewFieldsApi: boolean;
  searchSource: ISearchSource;
  stateContainer: GetStateReturn;
}) {
  const subject: DocumentSubject = useMemo(
    () => new BehaviorSubject({ state: fetchStatuses.UNINITIALIZED }),
    []
  );
  const fetch = useCallback(
    ({
      abortController,
      searchSessionId,
      inspectorAdapters,
    }: {
      abortController: AbortController;
      searchSessionId: string;
      inspectorAdapters: Adapters;
    }) => {
      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource: searchSource,
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
        showUnmappedFields: useNewFieldsApi,
      });
      subject.next({ state: fetchStatuses.LOADING });

      const searchSourceFetch$ = searchSource.fetch$({
        abortSignal: abortController.signal,
        sessionId: searchSessionId,
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitleDocuments', {
            defaultMessage: 'documents data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
            defaultMessage:
              'This request queries Elasticsearch to fetch the documents for the search.',
          }),
        },
      });
      searchSourceFetch$.subscribe({
        next: ({ rawResponse }) => {
          subject.next({ state: fetchStatuses.COMPLETE, documents: rawResponse.hits.hits });
          return rawResponse.hits.hits;
        },
      });

      return searchSourceFetch$;
    },
    [
      stateContainer.appStateContainer,
      searchSource,
      indexPattern,
      services,
      useNewFieldsApi,
      subject,
    ]
  );
  return {
    fetch,
    fetch$: subject,
  };
}
