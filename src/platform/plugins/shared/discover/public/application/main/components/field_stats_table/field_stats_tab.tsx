/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { filter, map } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { DataVisualizerTableState } from '@kbn/data-visualizer-plugin/common/types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FieldStatisticsTable } from './field_stats_table';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  selectTabCombinedFilters,
  useAppStateSelector,
  useCurrentTabSelector,
} from '../../state_management/redux';
import { FetchStatus } from '../../../types';
import type { FieldStatisticsTableProps } from './types';
import {
  internalStateActions,
  useCurrentTabAction,
  useCurrentTabDataStateContainer,
  useInternalStateDispatch,
} from '../../state_management/redux';

type FieldStatisticsTabProps = Omit<FieldStatisticsTableProps, 'query' | 'filters'>;

export const FieldStatisticsTab: React.FC<FieldStatisticsTabProps> = React.memo((props) => {
  const services = useDiscoverServices();
  const query = useAppStateSelector((state) => state.query);
  const filters = useCurrentTabSelector(selectTabCombinedFilters);
  const isEsql = useIsEsqlMode();
  const hideAggregatedPreview = useAppStateSelector((state) => state.hideAggregatedPreview);
  const dataStateContainer = useCurrentTabDataStateContainer();

  const lastReloadRequestTime$ = useMemo(() => {
    return dataStateContainer.refetch$.pipe(map(() => Date.now()));
  }, [dataStateContainer]);
  const lastReloadRequestTime = useObservable(lastReloadRequestTime$);

  const totalHitsComplete$ = useMemo(() => {
    return dataStateContainer.data$.totalHits$.pipe(
      filter((d) => d.fetchStatus === FetchStatus.COMPLETE),
      map((d) => d.result)
    );
  }, [dataStateContainer]);
  const totalHits = useObservable(totalHitsComplete$);

  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const updateState = useCallback(
    (changes: Partial<DataVisualizerTableState>) => {
      if (changes.showDistributions !== undefined) {
        dispatch(
          updateAppState({ appState: { hideAggregatedPreview: !changes.showDistributions } })
        );
      }
    },
    [dispatch, updateAppState]
  );

  // Quit early if we know it's in ES|QL mode
  if (isEsql && services.dataVisualizer?.FieldStatsUnavailableMessage) {
    return <services.dataVisualizer.FieldStatsUnavailableMessage />;
  }

  return (
    <FieldStatisticsTable
      dataView={props.dataView}
      columns={props.columns}
      onAddFilter={props.onAddFilter}
      trackUiMetric={props.trackUiMetric}
      isEsqlMode={props.isEsqlMode}
      query={query}
      filters={filters}
      lastReloadRequestTime={lastReloadRequestTime}
      hideAggregatedPreview={hideAggregatedPreview}
      totalHits={totalHits}
      updateState={updateState}
    />
  );
});
