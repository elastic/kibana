/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource } from '@kbn/data-plugin/public';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { RecordsFetchResponse } from '../../types';
import { getAllowedSampleSize } from '../../../utils/get_allowed_sample_size';
import type { CommonFetchParams } from './fetch_all';

/**
 * Requests the documents for Discover. This will return a promise that will resolve
 * with the documents.
 */
export const fetchDocuments = async (
  searchSource: ISearchSource,
  {
    abortController,
    inspectorAdapters,
    searchSessionId,
    services,
    scopedProfilesManager,
    getCurrentTab,
  }: CommonFetchParams
): Promise<RecordsFetchResponse> => {
  const { sampleSize } = getCurrentTab().appState;
  searchSource.setField('size', getAllowedSampleSize(sampleSize, services.uiSettings));
  searchSource.setField('trackTotalHits', false);
  searchSource.setField('highlightAll', true);
  searchSource.setField('version', true);
  if (searchSource.getField('index')?.type === DataViewType.ROLLUP) {
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

  // Build the search request (this is the ES DSL)
  const searchRequest = searchSource.build();

  // Extract index for searchDSL
  const index =
    typeof searchRequest.index === 'string'
      ? searchRequest.index
      : searchRequest.index?.getIndexPattern();

  // Call typed search service directly
  const result = await services.data.search.typed.searchDSL(
    {
      index,
      ...searchRequest.body,
    },
    {
      abortSignal: abortController.signal,
      sessionId: isFetchingMore ? undefined : searchSessionId,
      executionContext,
    }
  );

  // Build records from response
  const records = buildDataTableRecordList({
    records: result.rawResponse.hits.hits,
    dataView,
    processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
  });

  const adapter = inspectorAdapters.requests;
  const interceptedWarnings: SearchResponseWarning[] = [];
  if (adapter) {
    services.data.search.showWarnings(adapter, (warning) => {
      interceptedWarnings.push(warning);
      return true; // suppress the default behaviour
    });
  }

  return {
    records,
    interceptedWarnings,
  };
};
