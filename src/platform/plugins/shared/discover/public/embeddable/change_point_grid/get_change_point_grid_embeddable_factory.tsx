/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingChart } from '@elastic/eui';
import type { ChangePointCardModel } from '@kbn/change-point-chart-viewer';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import {
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  type HasTypeDisplayName,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesEsql,
  type PublishesWritableTimeRange,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import type { UnifiedHistogramFetch$Arguments } from '@kbn/unified-histogram/types';
import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject, merge, ReplaySubject } from 'rxjs';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE } from '../../../common';
import type { DiscoverServices } from '../../build_services';
import type { ChangePointGridEmbeddableState } from '../../../server/embeddable/change_point_grid_schema';
import { ChangePointGridRenderer } from './change_point_grid_renderer';
import { initializeChangePointGridFetch } from './initialize_change_point_grid_fetch';
import type { ChangePointGridSearchRequest } from './resolve_change_point_grid_search_request';

const defaultTitle = i18n.translate('discover.changePointGrid.defaultTitle', {
  defaultMessage: 'Change point charts',
});

/** Panel header title. Uses the ES|QL source when the query has one. */
const getDefaultPanelTitle = (esql: string): string => {
  const source = getIndexPatternFromESQLQuery(esql);
  if (!source) {
    return defaultTitle;
  }

  return i18n.translate('discover.changePointGrid.defaultTitleWithSource', {
    defaultMessage: 'Change points in {source}',
    values: { source },
  });
};

type ChangePointGridApi = DefaultEmbeddableApi<ChangePointGridEmbeddableState> &
  HasTypeDisplayName &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesEsql &
  PublishesWritableTimeRange & {
    searchContext$: PublishingSubject<ChangePointGridSearchRequest | undefined>;
    applyDashboardContext: boolean;
  };

export const getChangePointGridEmbeddableFactory = ({
  discoverServices,
}: {
  discoverServices: DiscoverServices;
}): EmbeddablePublicDefinition<ChangePointGridEmbeddableState, ChangePointGridApi> => ({
  type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const defaultTitle$ = new BehaviorSubject<string | undefined>(
      getDefaultPanelTitle(initialState.esql)
    );
    const cards$ = new BehaviorSubject<ChangePointCardModel[] | undefined>(undefined);
    const searchContext$ = new BehaviorSubject<ChangePointGridSearchRequest | undefined>(undefined);
    const esql$ = new BehaviorSubject<AggregateQuery[]>([{ esql: initialState.esql }]);
    const approximationApplied$ = new BehaviorSubject<boolean | undefined>(undefined);
    const applyDashboardContext = initialState.apply_dashboard_context !== false;
    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
    const refresh$ = new ReplaySubject<UnifiedHistogramFetch$Arguments>(1);

    const stateApi = initializeStateApi<ChangePointGridEmbeddableState>({
      uuid,
      parentApi,
      serializeState: () => ({
        ...titleManager.getLatestState(),
        ...timeRangeManager.getLatestState(),
        esql: initialState.esql,
        apply_dashboard_context: applyDashboardContext,
        ...(applyDashboardContext ? {} : { static_context: initialState.static_context }),
      }),
      anyStateChange$: merge(titleManager.anyStateChange$, timeRangeManager.anyStateChange$),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        esql: 'skip',
        apply_dashboard_context: 'skip',
        static_context: 'skip',
      }),
      applySerializedState: (state) => {
        titleManager.reinitializeState(state);
        timeRangeManager.reinitializeState(state);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      defaultTitle$,
      dataLoading$,
      blockingError$,
      esql$,
      approximationApplied$,
      searchContext$,
      applyDashboardContext,
      getTypeDisplayName: () => defaultTitle,
    });

    const { cleanup } = initializeChangePointGridFetch({
      api,
      state: initialState,
      discoverServices,
      cards$,
      searchContext$,
      // The chart hook only uses this emission as a rebuild trigger and ignores the payload.
      onCardsUpdated: () => refresh$.next(undefined as unknown as UnifiedHistogramFetch$Arguments),
      setDataLoading: (loading) => dataLoading$.next(loading),
      setSearchError: (error) => blockingError$.next(error),
      setApproximationApplied: (applied) => approximationApplied$.next(applied),
    });

    return {
      api,
      Component: () => {
        useEffect(() => cleanup, []);

        const [cards, searchContext, isLoading] = useBatchedPublishingSubjects(
          cards$,
          searchContext$,
          dataLoading$
        );
        const fetchParams = useMemo(
          () =>
            searchContext
              ? ({
                  // Mini charts compare annotation timestamps to this range, which is only
                  // valid once relative dates like `now-15m` are resolved to absolute ISO.
                  timeRange: getAbsoluteTimeRange(searchContext.timeRange),
                  esqlVariables: searchContext.esqlVariables,
                  searchSessionId: searchContext.searchSessionId,
                  lastReloadRequestTime: Date.now(),
                } as React.ComponentProps<typeof ChangePointGridRenderer>['fetchParams'])
              : undefined,
          [searchContext]
        );

        if (!searchContext || !fetchParams || !cards) {
          return isLoading ? <EuiLoadingChart size="l" /> : null;
        }

        return (
          <ChangePointGridRenderer
            esql={initialState.esql}
            cards={cards}
            services={discoverServices}
            fetchParams={fetchParams}
            fetch$={refresh$}
            searchContext={{
              filters: searchContext.filters,
              query: searchContext.inputQuery,
            }}
          />
        );
      },
    };
  },
});
