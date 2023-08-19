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
import { SAMPLE_SIZE_SETTING, buildDataTableRecordList } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { getSearchResponseInterceptedWarnings } from '@kbn/search-response-warnings';
import type { RecordsFetchResponse } from '../../../types';
import { DISABLE_SHARD_FAILURE_WARNING } from '../../../../common/constants';
import { FetchDeps } from './fetch_all';

/**
 * Requests the documents for Discover. This will return a promise that will resolve
 * with the documents.
 */
export const fetchDocuments = (
  searchSource: ISearchSource,
  { abortController, inspectorAdapters, searchSessionId, services }: FetchDeps
): Promise<RecordsFetchResponse> => {
  searchSource.setField('size', services.uiSettings.get(SAMPLE_SIZE_SETTING));
  searchSource.setField('trackTotalHits', false);
  searchSource.setField('highlightAll', true);
  searchSource.setField('version', true);
  if (searchSource.getField('index')?.type === 'rollup') {
    // We treat that data view as "normal" even if it was a rollup data view,
    // since the rollup endpoint does not support querying individual documents, but we
    // can get them from the regular _search API that will be used if the data view
    // not a rollup data view.
    searchSource.setOverwriteDataViewType(undefined);
  }
  const dataView = searchSource.getField('index')!;
  const isFetchingMore = Boolean(searchSource.getField('searchAfter'));

  const executionContext = {
    description: isFetchingMore ? 'fetch more documents' : 'fetch documents',
  };

  const fetch$ = searchSource
    .fetch$({
      abortSignal: abortController.signal,
      sessionId: isFetchingMore ? undefined : searchSessionId,
      inspector: {
        adapter: inspectorAdapters.requests,
        title: isFetchingMore // TODO: show it as a separate request in Inspect flyout
          ? i18n.translate('discover.inspectorRequestDataTitleMoreDocuments', {
              defaultMessage: 'More documents',
            })
          : i18n.translate('discover.inspectorRequestDataTitleDocuments', {
              defaultMessage: 'Documents',
            }),
        description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
          defaultMessage: 'This request queries Elasticsearch to fetch the documents.',
        }),
      },
      executionContext,
      disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
    })
    .pipe(
      filter((res) => isCompleteResponse(res)),
      map((res) => {
        return buildDataTableRecordList(res.rawResponse.hits.hits as EsHitRecord[], dataView);
      })
    );

  return lastValueFrom(fetch$).then((records) => {
    const adapter = inspectorAdapters.requests;
    const interceptedWarnings = adapter
      ? getSearchResponseInterceptedWarnings({
          services,
          adapter,
          options: {
            disableShardFailureWarning: DISABLE_SHARD_FAILURE_WARNING,
          },
        })
      : [];

    return {
      records,
      interceptedWarnings,
    };
  });
};
