/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { of, map } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FIELD_STATISTICS_LOADED } from './constants';
import type { NormalSamplingOption, FieldStatisticsTableProps } from './types';
export type { FieldStatisticsTableProps };

const statsTableCss = css({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  '.kbnDocTableWrapper': {
    overflowX: 'hidden',
  },
});

const fallBacklastReloadRequestTime$ = new BehaviorSubject(0);

export const FieldStatisticsTable = (props: FieldStatisticsTableProps) => {
  const {
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    searchSessionId,
  } = props;

  const totalHits = useObservable(stateContainer?.dataState.data$.totalHits$ ?? of(undefined));
  const totalDocuments = useMemo(() => totalHits?.result, [totalHits]);

  const services = useDiscoverServices();
  const dataVisualizerService = services.dataVisualizer;

  // State from Discover we want the embeddable to reflect
  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  const lastReloadRequestTime$ = useMemo(() => {
    return stateContainer?.dataState?.refetch$
      ? stateContainer?.dataState?.refetch$.pipe(map(() => Date.now()))
      : fallBacklastReloadRequestTime$;
  }, [stateContainer]);

  const lastReloadRequestTime = useObservable(lastReloadRequestTime$, 0);

  useEffect(() => {
    // Track should only be called once when component is loaded
    trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);
  }, [trackUiMetric]);

  const samplingOption: NormalSamplingOption = useMemo(
    () =>
      ({
        mode: 'normal_sampling',
        shardSize: 5000,
        seed: searchSessionId,
      } as NormalSamplingOption),
    [searchSessionId]
  );

  const updateState = useCallback(
    (changes) => {
      if (changes.showDistributions !== undefined && stateContainer) {
        stateContainer.appState.update({ hideAggregatedPreview: !changes.showDistributions });
      }
    },
    [stateContainer]
  );

  if (!dataVisualizerService) return null;

  return (
    <EuiFlexItem css={statsTableCss} data-test-subj="dscFieldStatsEmbeddedContent">
      <dataVisualizerService.FieldStatisticsTable
        shouldGetSubfields={true}
        dataView={dataView}
        savedSearch={savedSearch}
        filters={filters}
        query={query}
        visibleFieldNames={columns}
        sessionId={searchSessionId}
        totalDocuments={totalDocuments}
        samplingOption={samplingOption}
        lastReloadRequestTime={lastReloadRequestTime}
        onAddFilter={onAddFilter}
        showPreviewByDefault={showPreviewByDefault}
        onTableUpdate={updateState}
      />
    </EuiFlexItem>
  );
};
