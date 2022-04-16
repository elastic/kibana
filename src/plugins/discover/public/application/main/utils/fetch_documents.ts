/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { isCompleteResponse, ISearchSource } from '@kbn/data-plugin/public';
import { SAMPLE_SIZE_SETTING } from '../../../../common';
import { FetchDeps } from './fetch_all';

/**
 * Requests the documents for Discover. This will return a promise that will resolve
 * with the documents.
 */
export const fetchDocuments = (
  searchSource: ISearchSource,
  { abortController, inspectorAdapters, searchSessionId, services, savedSearch }: FetchDeps
) => {
  searchSource.setField('size', services.uiSettings.get(SAMPLE_SIZE_SETTING));
  searchSource.setField('trackTotalHits', false);
  searchSource.setField('highlightAll', true);
  searchSource.setField('version', true);
  if (searchSource.getField('index')?.type === 'rollup') {
    // We treat that index pattern as "normal" even if it was a rollup index pattern,
    // since the rollup endpoint does not support querying individual documents, but we
    // can get them from the regular _search API that will be used if the index pattern
    // not a rollup index pattern.
    searchSource.setOverwriteDataViewType(undefined);
  }

  const executionContext = {
    description: 'fetch documents',
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
    .pipe(
      filter((res) => isCompleteResponse(res)),
      map((res) => res.rawResponse.hits.hits)
    );

  return lastValueFrom(fetch$);
};
