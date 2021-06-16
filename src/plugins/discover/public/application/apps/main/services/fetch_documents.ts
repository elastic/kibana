/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { IndexPattern, ISearchSource } from '../../../../kibana_services';
import { updateSearchSource } from '../utils/update_search_source';
import { DiscoverServices } from '../../../../build_services';
import { GetStateReturn } from './discover_state';
import { SortOrder } from '../../../../saved_searches/types';
import { Adapters } from '../../../../../../inspector/common';

export const fetchDocuments = ({
  abortController,
  indexPattern,
  inspectorAdapters,
  searchSessionId,
  searchSource,
  services,
  stateContainer,
  useNewFieldsApi,
}: {
  abortController: AbortController;
  indexPattern: IndexPattern;
  inspectorAdapters: Adapters;
  searchSessionId: string;
  searchSource: ISearchSource;
  services: DiscoverServices;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}) => {
  const { sort } = stateContainer.appStateContainer.getState();
  updateSearchSource(searchSource, false, {
    indexPattern,
    services,
    sort: sort as SortOrder[],
    useNewFieldsApi,
  });

  return searchSource.fetch$({
    abortSignal: abortController.signal,
    sessionId: searchSessionId,
    inspector: {
      adapter: inspectorAdapters.requests,
      title: i18n.translate('discover.inspectorRequestDataTitleDocuments', {
        defaultMessage: 'documents data',
      }),
      description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
        defaultMessage: 'This request queries Elasticsearch to fetch the documents for the search.',
      }),
    },
  });
};
