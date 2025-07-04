/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { of, map, filter } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { DataVisualizerTableItem } from '@kbn/data-visualizer-plugin/public/application/common/components/stats_table/types';
import type { DataVisualizerTableState } from '@kbn/data-visualizer-plugin/common/types';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FIELD_STATISTICS_LOADED } from './constants';

import type { NormalSamplingOption, FieldStatisticsTableProps } from './types';
export type { FieldStatisticsTableProps };

const statsTableCss = css({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
});

const fallBacklastReloadRequestTime$ = new BehaviorSubject(0);
const fallbackTotalHits = of(undefined);

export const FieldStatisticsTable = React.memo((props: FieldStatisticsTableProps) => {
  const {
    isEsqlMode,
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    searchSessionId,
    timeRange,
  } = props;

  // If `_source` is in the columns, we should exclude it for Field Statistics
  const visibleFieldNames = useMemo(() => columns.filter((col) => col !== '_source'), [columns]);

  const renderFieldName = useCallback((_: string, item: DataVisualizerTableItem) => {
    return <>{item.displayName ?? item.fieldName}</>;
  }, []);

  const services = useDiscoverServices();

  // Other apps consuming Discover UI might inject their own proxied data services
  // so we need override the kibana context services with the injected proxied services
  // to make sure the table use the right service
  const overridableServices = useMemo(() => {
    return { data: services.data };
  }, [services.data]);

  const dataVisualizerService = services.dataVisualizer;

  // State from Discover we want the embeddable to reflect
  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  const lastReloadRequestTime$ = useMemo(() => {
    return stateContainer?.dataState?.refetch$
      ? stateContainer?.dataState?.refetch$.pipe(
          map(() => {
            return Date.now();
          })
        )
      : fallBacklastReloadRequestTime$;
  }, [stateContainer]);

  const totalHitsComplete$ = useMemo(() => {
    return stateContainer
      ? stateContainer.dataState.data$.totalHits$.pipe(
          filter((d) => d.fetchStatus === 'complete'),
          map((d) => d?.result)
        )
      : fallbackTotalHits;
  }, [stateContainer]);

  const totalDocuments = useObservable(totalHitsComplete$);
  const lastReloadRequestTime = useObservable(lastReloadRequestTime$);

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
    (changes: Partial<DataVisualizerTableState>) => {
      if (changes.showDistributions !== undefined && stateContainer) {
        stateContainer.appState.update({ hideAggregatedPreview: !changes.showDistributions }, true);
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
        esqlQuery={isEsqlMode && isOfAggregateQueryType(query) ? query : undefined}
        query={query}
        visibleFieldNames={visibleFieldNames}
        sessionId={searchSessionId}
        totalDocuments={totalDocuments}
        samplingOption={samplingOption}
        lastReloadRequestTime={lastReloadRequestTime}
        onAddFilter={onAddFilter}
        showPreviewByDefault={showPreviewByDefault}
        onTableUpdate={updateState}
        renderFieldName={renderFieldName}
        isEsqlMode={isEsqlMode}
        overridableServices={overridableServices}
        timeRange={timeRange}
      />
    </EuiFlexItem>
  );
});
