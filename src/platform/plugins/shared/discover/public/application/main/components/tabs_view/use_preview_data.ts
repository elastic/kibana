/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import type { TabItem, TabPreviewData } from '@kbn/unified-tabs';
import { TabStatus } from '@kbn/unified-tabs';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { RuntimeStateManager, TabState } from '../../state_management/redux';
import {
  selectTabRuntimeState,
  useInternalStateSelector,
  selectAllTabs,
  selectRecentlyClosedTabs,
} from '../../state_management/redux';
import { FetchStatus } from '../../../types';
import type { RecentlyClosedTabState } from '../../state_management/redux/types';

export const usePreviewData = (runtimeStateManager: RuntimeStateManager) => {
  const allTabs = useInternalStateSelector(selectAllTabs);
  const recentlyClosedTabs = useInternalStateSelector(selectRecentlyClosedTabs);
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);

  const previewDataMap$ = useMemo(
    () =>
      combineLatest(
        [...allTabs, ...recentlyClosedTabs].reduce<Record<string, Observable<TabPreviewData>>>(
          (acc, tabState) => {
            const tabId = tabState.id;
            return {
              ...acc,
              [tabId]: getPreviewDataObservable(runtimeStateManager, tabState, savedDataViews),
            };
          },
          {}
        )
      ),
    [allTabs, recentlyClosedTabs, runtimeStateManager, savedDataViews]
  );
  const previewDataMap = useObservable(previewDataMap$);
  const getPreviewData = useCallback(
    (item: TabItem) =>
      previewDataMap?.[item.id] ?? {
        status: TabStatus.SUCCESS,
        query: DEFAULT_PREVIEW_QUERY,
      },
    [previewDataMap]
  );

  return { getPreviewData };
};

const getPreviewStatus = (fetchStatus: FetchStatus): TabPreviewData['status'] => {
  switch (fetchStatus) {
    case FetchStatus.UNINITIALIZED:
    case FetchStatus.COMPLETE:
      return TabStatus.SUCCESS;
    case FetchStatus.ERROR:
      return TabStatus.ERROR;
    default:
      return TabStatus.RUNNING;
  }
};

const DEFAULT_PREVIEW_QUERY = {
  language: 'kuery',
  query: i18n.translate('discover.tabsView.defaultQuery', { defaultMessage: '(Empty query)' }),
};

const getPreviewQuery = (
  query: TabPreviewData['query'] | undefined,
  dataViewName: string | undefined
): TabPreviewData['query'] => {
  if (!query) {
    return DEFAULT_PREVIEW_QUERY;
  }

  if (isOfAggregateQueryType(query)) {
    return {
      ...query,
      esql: query.esql.trim() || DEFAULT_PREVIEW_QUERY.query,
    };
  }

  const trimmedQuery = typeof query.query === 'string' ? query.query.trim() : query.query;

  return {
    ...query,
    query: trimmedQuery || (dataViewName ? '' : DEFAULT_PREVIEW_QUERY.query),
  };
};

const getDataViewNameFromInitialInternalState = (
  initialInternalState: TabState['initialInternalState'] | undefined,
  savedDataViews: DataViewListItem[]
): string | undefined => {
  if (!initialInternalState?.serializedSearchSource) {
    return undefined;
  }

  const index = initialInternalState.serializedSearchSource.index;

  if (typeof index === 'string') {
    const matchedDataView = savedDataViews.find((dv) => dv.id === index);
    return matchedDataView?.name || matchedDataView?.title;
  }

  if (index?.name) {
    return index.name;
  }

  return undefined;
};

const getPreviewTitle = (
  query: TabPreviewData['query'] | undefined,
  dataViewName: string | undefined
) => {
  if (isOfAggregateQueryType(query)) {
    return undefined;
  }

  return dataViewName
    ? i18n.translate('discover.tabsView.tabPreviewDataViewTitle', {
        defaultMessage: 'Data view: {dataViewName}',
        values: { dataViewName },
      })
    : undefined;
};

const getPreviewDataObservable = (
  runtimeStateManager: RuntimeStateManager,
  tabState: TabState | RecentlyClosedTabState,
  savedDataViews: DataViewListItem[]
) => {
  if ('closedAt' in tabState) {
    // Recently closed tab, no runtime state, no updates expected
    const derivedDataViewName = getDataViewNameFromInitialInternalState(
      tabState.initialInternalState,
      savedDataViews
    );
    return of({
      status: TabStatus.DEFAULT,
      query: getPreviewQuery(tabState.appState.query, derivedDataViewName),
      title: getPreviewTitle(tabState.appState.query, derivedDataViewName),
    });
  }

  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabState.id);

  return tabRuntimeState.stateContainer$.pipe(
    switchMap((tabStateContainer) => {
      if (!tabStateContainer) {
        const derivedDataViewName = getDataViewNameFromInitialInternalState(
          tabState.initialInternalState,
          savedDataViews
        );
        return of({
          status: TabStatus.DEFAULT,
          query: getPreviewQuery(tabState.appState.query, derivedDataViewName),
          title: getPreviewTitle(tabState.appState.query, derivedDataViewName),
        });
      }

      return combineLatest([
        tabStateContainer.dataState.data$.main$,
        tabRuntimeState.currentDataView$,
      ]).pipe(
        map(([{ fetchStatus }, dataView]) => ({
          fetchStatus,
          dataViewName: dataView?.name,
        })),
        distinctUntilChanged((prev, curr) => isEqual(prev, curr)),
        map(({ fetchStatus, dataViewName }) => {
          let derivedDataViewName = dataViewName;

          if (!derivedDataViewName && tabState.initialInternalState?.serializedSearchSource) {
            derivedDataViewName = getDataViewNameFromInitialInternalState(
              tabState.initialInternalState,
              savedDataViews
            );
          }

          return {
            status: tabState.forceFetchOnSelect ? TabStatus.DEFAULT : getPreviewStatus(fetchStatus),
            query: getPreviewQuery(tabState.appState.query, derivedDataViewName),
            title: getPreviewTitle(tabState.appState.query, derivedDataViewName),
          };
        })
      );
    })
  );
};
