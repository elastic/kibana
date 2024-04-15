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
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { fetch$ } from '@kbn/presentation-publishing';
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
  api: SearchEmbeddableApi & {
    dataLoading: BehaviorSubject<boolean | undefined>;
    blockingError: BehaviorSubject<Error | undefined>;
    rows: BehaviorSubject<DataTableRecord[]>;
  };
  discoverServices: DiscoverServices;
  savedSearch: SavedSearch;
}) {
  const requestAdapter = new RequestAdapter();
  let abortController = new AbortController(); // ???

  const fetchSubscription = fetch$(api)
    .pipe(
      switchMap(async (fetchContext) => {
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

        try {
          api.dataLoading.next(true);
          // Log request to inspector
          requestAdapter.reset();

          if (useTextBased && query && !isTextBasedQuery(fetchContext.query)) {
            const result = await fetchTextBased(
              query!,
              dataView,
              discoverServices.data,
              discoverServices.expressions,
              discoverServices.inspector,
              abortController.signal,
              [...filters, ...(fetchContext.filters ?? [])],
              fetchContext.query
            );

            console.log('result', result);
            // searchProps.columnsMeta = result.textBasedQueryColumns
            //   ? getTextBasedColumnsMeta(result.textBasedQueryColumns)
            //   : undefined;
            // searchProps.totalHitCount = result.records.length;
            // searchProps.isPlainRecord = true;
            // searchProps.isSortEnabled = true;
            return { rows: result.records };
          }

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
          };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe((next) => {
      api.dataLoading.next(false);
      if (next && next.hasOwnProperty('rows') && next.rows !== undefined) {
        api.rows.next(next.rows);
      }
      if (next && next.hasOwnProperty('error')) {
        api.blockingError.next(next.error);
      }
    });

  return () => fetchSubscription.unsubscribe();
}
