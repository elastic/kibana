/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, lastValueFrom } from 'rxjs';

import {
  buildDataTableRecord,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { EsHitRecord } from '@kbn/discover-utils/types';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { FetchContext, onFetchContextChanged } from '@kbn/presentation-publishing';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SearchResponseWarning } from '@kbn/search-response-warnings';

import { fetchTextBased } from '../../application/main/utils/fetch_text_based';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { DiscoverServices } from '../../build_services';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SearchEmbeddableApi } from '../types';
import { updateSearchSource } from '../utils/update_search_source';

export function initializeFetch({
  api,
  discoverServices,
  savedSearch,
}: {
  api: SearchEmbeddableApi;
  discoverServices: DiscoverServices;
  savedSearch: SavedSearch;
}) {
  const requestAdapter = new RequestAdapter();
  let abortController = new AbortController(); // ???

  const onFetch = async (fetchContext: FetchContext, isCanceled: () => boolean) => {
    console.log('onFetch', fetchContext);
    api.blockingError.next(undefined);
    const dataView = savedSearch.searchSource.getField('index');
    if (!dataView) {
      return;
    }
    const query = savedSearch.searchSource.getField('query');
    const filters = savedSearch.searchSource.getField('filter') as Filter[];

    // Abort any in-progress requests
    abortController.abort();
    abortController = new AbortController();

    const searchSessionId = fetchContext.searchSessionId;
    const useNewFieldsApi = !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);
    const useTextBased = isTextBasedQuery(query);
    updateSearchSource(
      savedSearch.searchSource,
      dataView,
      savedSearch.sort,
      getAllowedSampleSize(savedSearch.sampleSize, discoverServices.uiSettings),
      useNewFieldsApi,
      {
        sortDir: discoverServices.uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      }
    );

    api.dataLoading.next(true);
    // Log request to inspector
    requestAdapter.reset();

    // searchProps.interceptedWarnings = undefined;
    try {
      console.log('useTextBased', useTextBased, fetchContext.query);
      // Request text based data
      if (useTextBased && query && !isTextBasedQuery(fetchContext.query)) {
        const result = await fetchTextBased(
          query!,
          dataView,
          discoverServices.data,
          discoverServices.expressions,
          discoverServices.inspector,
          abortController.signal,
          filters,
          fetchContext.query
        );

        console.log('result', result);
        api.rows.next(result.records);
        api.dataLoading.next(false);
        // searchProps.columnsMeta = result.textBasedQueryColumns
        //   ? getTextBasedColumnsMeta(result.textBasedQueryColumns)
        //   : undefined;
        // searchProps.totalHitCount = result.records.length;
        // searchProps.isPlainRecord = true;
        // searchProps.isSortEnabled = true;
        return;
      }

      // const test: KibanaExecutionContext = {
      //   type: this.type,
      //   name: 'discover',
      //   id: savedSearch.id,
      //   description: this.output.title || this.output.defaultTitle || '',
      //   url: this.output.editUrl,
      // };

      // Request document data
      const { rawResponse: resp } = await lastValueFrom(
        savedSearch.searchSource.fetch$({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
          inspector: {
            adapter: requestAdapter,
            title: i18n.translate('discover.embeddable.inspectorRequestDataTitle', {
              defaultMessage: 'Data',
            }),
            description: i18n.translate('discover.embeddable.inspectorRequestDescription', {
              defaultMessage:
                'This request queries Elasticsearch to fetch the data for the search.',
            }),
          },
          // executionContext,
          disableWarningToasts: true,
        })
      );

      const interceptedWarnings: SearchResponseWarning[] = [];
      discoverServices.data.search.showWarnings(requestAdapter, (warning) => {
        interceptedWarnings.push(warning);
        return true; // suppress the default behaviour
      });
      // searchProps.interceptedWarnings = interceptedWarnings;

      // searchProps.rows = resp.hits.hits.map((hit) =>
      //   buildDataTableRecord(hit as EsHitRecord, searchProps.dataView)
      // );

      api.rows.next(
        resp.hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord, dataView))
      );
      // searchProps.totalHitCount = resp.hits.total as number;

      api.dataLoading.next(false);
      // searchProps.isLoading = false;
    } catch (error) {
      console.log('error');
      const cancelled = !!abortController?.signal.aborted;
      if (!cancelled) {
        api.dataLoading.next(false);
        api.blockingError.next(error);
      }

      // if (!this.destroyed && !cancelled) {
      //   this.updateOutput({
      //     ...this.getOutput(),
      //     loading: false,
      //     error,
      //   });

      //   searchProps.isLoading = false;
      // }
    }

    // const wasAlreadyRendered = this.getOutput().rendered;

    api.dataLoading.next(false);

    // getCount(
    //   dataView,
    //   services.data,
    //   fetchContext.filters ?? [],
    //   fetchContext.query,
    //   // timeRange and timeslice provided seperatly so consumers can decide
    //   // whether to refetch data for just mask current data.
    //   // In this example, we must refetch because we need a count within the time range.
    //   fetchContext.timeslice
    //     ? {
    //         from: new Date(fetchContext.timeslice[0]).toISOString(),
    //         to: new Date(fetchContext.timeslice[1]).toISOString(),
    //         mode: 'absolute' as 'absolute',
    //       }
    //     : fetchContext.timeRange
    // )
    //   .then((nextCount: number) => {
    //     if (isUnmounted || isCanceled()) {
    //       return;
    //     }
    //     dataLoading$.next(false);
    //     count$.next(nextCount);
    //   })
    //   .catch((err) => {
    //     if (isUnmounted || isCanceled()) {
    //       return;
    //     }
    //     dataLoading$.next(false);
    //     error$.next(err);
    //   });
  };

  return onFetchContextChanged({
    api,
    onFetch,
    fetchOnSetup: true,
  });
}
