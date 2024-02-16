/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { Filter } from '@kbn/es-query';
import { PublishesLocalUnifiedSearch } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, lastValueFrom, Subject, Subscription } from 'rxjs';
import { auditTime, map, startWith, switchMap } from 'rxjs/operators';
import { v4 } from 'uuid';
import { DataTableQueryState } from './types';

export const initializeDataTableQueries = async (data: DataPublicPluginStart) => {
  // set up search source
  let abortController: AbortController | undefined;
  const searchSource = await data.search.searchSource.create();
  const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
  searchSource.setField('fields', [fields]);
  searchSource.setField('size', 50);

  // initialize state subjects
  const rows$ = new BehaviorSubject<DataTableRecord[] | undefined>([]);
  const queryLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const forceRefresh$ = new Subject<void>();
  const dataSubscription = new Subscription();

  let serviceStarted = false;
  const setProviders = (
    dataViews$: BehaviorSubject<DataView[]>,
    unifiedSearchProvider?: PublishesLocalUnifiedSearch
  ) => {
    if (!unifiedSearchProvider || serviceStarted) return;
    dataSubscription.add(
      combineLatest([
        unifiedSearchProvider.localFilters,
        unifiedSearchProvider.localTimeRange,
        unifiedSearchProvider.localQuery,
        dataViews$,
        forceRefresh$.pipe(startWith(undefined)),
      ])
        .pipe(
          auditTime(50),
          map(([filters, timeRange, query, dataViews]) => ({
            filters,
            timeRange,
            query,
            dataView: dataViews[0],
          })),
          switchMap((unifiedSearchState) => runQuery(unifiedSearchState))
        )
        .subscribe((rows) => rows$.next(rows))
    );
    serviceStarted = true;
  };

  // define force refresh function
  const forceRefresh = () => forceRefresh$.next();

  // define query function
  const runQuery = async (unifiedSearchState: DataTableQueryState) => {
    const { filters, query, timeRange, dataView } = unifiedSearchState;
    if (!dataView) return;
    queryLoading$.next(true);
    const timeRangeFilter = data.query.timefilter.timefilter.createFilter(
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

  // clean up function
  const onDestroy = () => {
    dataSubscription.unsubscribe();
    forceRefresh$.complete();
  };

  return {
    forceRefresh,
    rows$,
    queryLoading$,
    onDestroy,
    setProviders,
  };
};
