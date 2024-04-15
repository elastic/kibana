/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, lastValueFrom, switchMap } from 'rxjs';

import {
  buildDataTableRecord,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { fetch$, PublishingSubject } from '@kbn/presentation-publishing';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SearchResponseWarning } from '@kbn/search-response-warnings';

import { fetchTextBased } from '../../application/main/utils/fetch_text_based';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { DiscoverServices } from '../../build_services';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { updateSearchSource } from '../utils/update_search_source';
import { SearchEmbeddableApi } from '../types';

export function initializeFetch({
  api,
  discoverServices,
}: {
  api: SearchEmbeddableApi & {
    savedSearch$: PublishingSubject<SavedSearch>;
    dataLoading$: BehaviorSubject<boolean | undefined>;
    blockingError$: BehaviorSubject<Error | undefined>;
    rows$: BehaviorSubject<DataTableRecord[]>;
    searchSessionId$: BehaviorSubject<string | undefined>;
  };
  discoverServices: DiscoverServices;
}) {
  const requestAdapter = new RequestAdapter();
  let abortController = new AbortController(); // ???

  const fetchSubscription = fetch$(api)
    .pipe(
      switchMap(async (fetchContext) => {
        api.blockingError$.next(undefined);
        const savedSearch = api.savedSearch$.getValue();
        const dataView = savedSearch.searchSource.getField('index');
        if (!dataView) {
          return;
        }
        const query = savedSearch.searchSource.getField('query');

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

        try {
          api.dataLoading$.next(true);
          // Log request to inspector
          requestAdapter.reset();

          if (useTextBased && query && !isTextBasedQuery(fetchContext.query)) {
            /**
             * Fetch via text based / ESQL query
             */
            const result = await fetchTextBased(
              query!,
              dataView,
              discoverServices.data,
              discoverServices.expressions,
              discoverServices.inspector,
              abortController.signal,
              fetchContext.filters,
              fetchContext.query
            );
            // searchProps.columnsMeta = result.textBasedQueryColumns
            //   ? getTextBasedColumnsMeta(result.textBasedQueryColumns)
            //   : undefined;
            // searchProps.totalHitCount = result.records.length;
            // searchProps.isPlainRecord = true;
            // searchProps.isSortEnabled = true;
            return { rows: result.records, searchSessionId };
          }

          /**
           * Fetch via saved search
           */
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

          return {
            rows: resp.hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord, dataView)),
            searchSessionId,
          };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe((next) => {
      api.dataLoading$.next(false);
      if (next && next.hasOwnProperty('rows')) {
        api.rows$.next(next.rows ?? []);
      }
      if (next && next.hasOwnProperty('searchSessionId') && next.searchSessionId !== undefined) {
        api.searchSessionId$.next(next.searchSessionId);
      }
      if (next && next.hasOwnProperty('error')) {
        api.blockingError$.next(next.error);
      }
    });

  return () => {
    fetchSubscription.unsubscribe();
  };
}
