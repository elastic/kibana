/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import { isCompleteResponse, ISearchSource } from '../../../../../data/public';
import { DataViewType } from '../../../../../data_views/public';
import { FetchDeps } from './fetch_all';

export function fetchTotalHits(
  searchSource: ISearchSource,
  { abortController, inspectorAdapters, searchSessionId, savedSearch }: FetchDeps
) {
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

  const executionContext = {
    description: 'fetch total hits',
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
    .pipe(
      filter((res) => isCompleteResponse(res)),
      map((res) => res.rawResponse.hits.total as number)
    );

  return fetch$.toPromise();
}
