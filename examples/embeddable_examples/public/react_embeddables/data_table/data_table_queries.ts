/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { listenForCompatibleApi } from '@kbn/presentation-containers';
import { apiPublishesDataViews, fetch$ } from '@kbn/presentation-publishing';
import {
  auditTime,
  BehaviorSubject,
  combineLatest,
  lastValueFrom,
  map,
  Subscription,
  switchMap,
} from 'rxjs';
import { v4 } from 'uuid';
import { StartDeps } from '../../plugin';
import { apiPublishesSelectedFields } from '../field_list/publishes_selected_fields';
import { DataTableApi, DataTableQueryState } from './types';

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
        defaultMessage: 'The parent of this data table must provide unified search state.',
      })
    );
  }

  // set up search source
  let abortController: AbortController | undefined;
  const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
  searchSource.setField('fields', [fields]);
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
      const dataViewSubscription = dataViewProvider.dataViews.subscribe((dataViews) => {
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

  // run query whenever the unified search state changes
  const runQuery = async (unifiedSearchState: DataTableQueryState) => {
    const { filters, query, timeRange, dataView } = unifiedSearchState;
    if (!dataView) return;
    queryLoading$.next(true);
    const timeRangeFilter = services.data.query.timefilter.timefilter.createFilter(
      dataView,
      timeRange
    ) as Filter;
    searchSource.setField('filter', [...(filters ?? []), timeRangeFilter]);
    searchSource.setField('query', query);
    searchSource.setField('index', dataView);

    abortController?.abort();
    abortController = new AbortController();
    const { rawResponse: resp } = await lastValueFrom(
      searchSource.fetch$({
        abortSignal: abortController.signal,
        sessionId: v4(), // todo, search sessions
        disableWarningToasts: true,
      })
    );
    queryLoading$.next(false);
    return resp.hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord, dataView));
  };

  dataSubscription.add(
    combineLatest([fetch$(api), dataView$])
      .pipe(
        auditTime(50),
        map(([{ filters, timeRange, query }, dataView]) => ({
          filters,
          timeRange,
          query,
          dataView,
        })),
        switchMap((unifiedSearchState) => runQuery(unifiedSearchState))
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
