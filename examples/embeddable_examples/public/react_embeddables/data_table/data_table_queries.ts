/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  listenForCompatibleApi,
  apiPublishesDataViews,
  fetch$,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, lastValueFrom, map, Subscription, switchMap } from 'rxjs';
import type { StartDeps } from '../../plugin';
import { apiPublishesSelectedFields } from './publishes_selected_fields';
import type { DataTableApi } from './types';

export const initializeDataTableQueries = async (
  services: StartDeps,
  api: DataTableApi,
  queryLoading$: BehaviorSubject<boolean | undefined>
) => {
  // initialize services
  const defaultDataViewPromise = services.data.dataViews.getDefault();
  const searchSourcePromise = services.data.search.searchSource.create();
  const [defaultDataView, searchSource] = await Promise.all([
    defaultDataViewPromise,
    searchSourcePromise,
  ]);
  if (!defaultDataView) {
    throw new Error(
      i18n.translate('embeddableExamples.dataTable.noDataViewError', {
        defaultMessage: 'At least one data view is required to use the data table example..',
      })
    );
  }

  // set up search source
  let abortController: AbortController | undefined;
  searchSource.setField('fields', [{ field: '*', include_unmapped: true }]);
  searchSource.setField('size', 50);

  // initialize state for API.
  const fields$ = new BehaviorSubject<string[]>([]);
  const dataView$ = new BehaviorSubject<DataView>(defaultDataView);
  const rows$ = new BehaviorSubject<DataTableRecord[] | undefined>([]);

  const dataSubscription = new Subscription();

  // set up listeners - these will listen for the closest compatible api (parent or sibling)
  const stopListeningForDataViews = listenForCompatibleApi(
    api.parentApi,
    apiPublishesDataViews,
    (dataViewProvider) => {
      if (!dataViewProvider) {
        dataView$.next(defaultDataView);
        return;
      }
      const dataViewSubscription = dataViewProvider.dataViews$.subscribe((dataViews) => {
        dataView$.next(dataViews?.[0] ?? defaultDataView);
      });
      return () => dataViewSubscription.unsubscribe();
    }
  );
  const stopListeningForFields = listenForCompatibleApi(
    api.parentApi,
    apiPublishesSelectedFields,
    (fieldsProvider) => {
      if (!fieldsProvider) {
        fields$.next([]);
        return;
      }
      const fieldsSubscription = fieldsProvider.selectedFields.subscribe((nextFields) => {
        fields$.next(nextFields ?? []);
      });
      return () => fieldsSubscription.unsubscribe();
    }
  );

  // run query whenever the embeddable's fetch state or the data view changes
  dataSubscription.add(
    combineLatest([fetch$(api), dataView$])
      .pipe(
        map(([{ filters, timeRange, query, timeslice, searchSessionId }, dataView]) => ({
          filters,
          timeRange,
          query,
          dataView,
          timeslice,
          searchSessionId,
        })),
        switchMap(async ({ filters, query, timeRange, dataView, timeslice, searchSessionId }) => {
          if (!dataView) return;
          queryLoading$.next(true);
          const appliedTimeRange = timeslice
            ? {
                from: new Date(timeslice[0]).toISOString(),
                to: new Date(timeslice[1]).toISOString(),
                mode: 'absolute' as 'absolute',
              }
            : timeRange;
          const timeRangeFilter = services.data.query.timefilter.timefilter.createFilter(
            dataView,
            appliedTimeRange
          ) as Filter;
          searchSource.setField('filter', [...(filters ?? []), timeRangeFilter]);
          searchSource.setField('query', query);
          searchSource.setField('index', dataView);

          abortController?.abort();
          abortController = new AbortController();
          const { rawResponse: resp } = await lastValueFrom(
            searchSource.fetch$({
              abortSignal: abortController.signal,
              sessionId: searchSessionId,
              disableWarningToasts: true,
            })
          );
          queryLoading$.next(false);
          return resp.hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord, dataView));
        })
      )
      .subscribe((rows) => rows$.next(rows))
  );

  return {
    rows$,
    fields$,
    dataView$,
    stop: () => {
      stopListeningForDataViews();
      stopListeningForFields();
      dataSubscription.unsubscribe();
    },
  };
};
