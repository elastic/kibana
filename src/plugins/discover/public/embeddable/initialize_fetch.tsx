/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom, switchMap } from 'rxjs';

import {
  buildDataTableRecord,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { EsHitRecord } from '@kbn/discover-utils/types';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { fetch$, FetchContext } from '@kbn/presentation-publishing';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SearchResponseWarning } from '@kbn/search-response-warnings';

import { fetchEsql } from '../application/main/data_fetching/fetch_esql';
import { DiscoverServices } from '../build_services';
import { getAllowedSampleSize } from '../utils/get_allowed_sample_size';
import { SearchEmbeddableApi } from './types';
import { updateSearchSource } from './utils/update_search_source';

export const isEsqlMode = (savedSearch: Pick<SavedSearch, 'searchSource'>): boolean => {
  const query = savedSearch.searchSource.getField('query');
  return isOfAggregateQueryType(query);
};

export function initializeFetch({
  api,
  discoverServices,
}: {
  api: SearchEmbeddableApi & { fetchContext$: BehaviorSubject<FetchContext | undefined> };
  discoverServices: DiscoverServices;
}) {
  const requestAdapter = new RequestAdapter();
  let abortController = new AbortController(); // ???

  const fetchSubscription = fetch$(api)
    .pipe(
      switchMap(async (fetchContext) => {
        // api.blockingError$.next(undefined);
        const dataView = api.dataViews.getValue()?.[0];
        const searchSource = api.searchSource$.getValue();
        if (!dataView || !searchSource) {
          return;
        }
        const query = searchSource.getField('query');
        const sort = api.sort$.getValue();
        const sampleSize = api.sampleSize$.getValue();

        // Abort any in-progress requests
        abortController.abort();
        abortController = new AbortController();

        const searchSessionId = fetchContext.searchSessionId;
        const useNewFieldsApi = !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);

        updateSearchSource(
          discoverServices,
          searchSource,
          dataView,
          sort,
          getAllowedSampleSize(sampleSize, discoverServices.uiSettings),
          useNewFieldsApi,
          fetchContext,
          {
            sortDir: discoverServices.uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
          }
        );

        try {
          // api.dataLoading$.next(true);
          // Log request to inspector
          requestAdapter.reset();

          const esqlMode = isEsqlMode({ searchSource });

          if (esqlMode && query) {
            const result = await fetchEsql(
              searchSource.getField('query')!,
              dataView,
              this.services.data,
              this.services.expressions,
              this.services.inspector,
              this.abortController.signal,
              this.input.filters,
              this.input.query
            );
          }
          // const parentContext = api.parentApi?.executionContext;
          // const child: KibanaExecutionContext = {
          //   type: SEARCH_EMBEDDABLE_TYPE,
          //   name: 'discover',
          //   id: savedSearch.id,
          //   description: api.panelTitle?.getValue() || api.defaultPanelTitle?.getValue() || '',
          //   // description: this.output.title || this.output.defaultTitle || '',
          //   // url: this.output.editUrl,
          // };
          // const executionContext = parentContext
          //   ? {
          //       ...parentContext,
          //       child,
          //     }
          //   : child;

          /**
           * Fetch via saved search
           */
          const { rawResponse: resp } = await lastValueFrom(
            searchSource.fetch$({
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
            fetchContext,
          };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe((next) => {
      // api.dataLoading$.next(false);
      if (next) {
        if (next.hasOwnProperty('rows')) {
          api.rows$.next(next.rows ?? []);
        }
        if (next.hasOwnProperty('fetchContext') && next.fetchContext !== undefined) {
          api.fetchContext$.next(next.fetchContext);
        }
        if (next.hasOwnProperty('error')) {
          // api.blockingError$.next(next.error);
        }
      }
    });

  return () => {
    fetchSubscription.unsubscribe();
  };
}
