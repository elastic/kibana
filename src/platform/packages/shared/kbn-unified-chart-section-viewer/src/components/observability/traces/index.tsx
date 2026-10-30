/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EuiButtonGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { UnifiedBreakdownFieldSelector, resolveBreakdownField } from '@kbn/unified-histogram';
import { isSelectionCondition } from '@kbn/trace-latency-map';
import { TraceMetricsProvider } from './context/trace_metrics_context';
import { TRACES_BREAKDOWN_RECOMMENDED_FIELDS } from './constants';
import { useEsqlQueryInfo } from '../../../hooks/use_esql_query_info';
import { useFeatureFlag } from '../../../hooks/use_feature_flag';
import { FEATURE_FLAGS } from '../../../common/constants';
import { ExternalServicesProvider } from '../../../context/external_services';
import { useTracesRestorableState, withTracesRestorableState } from '../../../restorable_state';
import type { TracesChartView } from '../../../restorable_state';
import { ErrorRateChart } from './error_rate';
import { LatencyChart } from './latency';
import { ThroughputChart } from './throughput';
import { TracesLatencyMapView } from './latency_map_view';
import { ChartsGrid } from '../../charts_grid';
import type { UnifiedMetricsGridProps } from '../../../types';
import { extractUsedMetadataFields } from '../../../utils';

export const chartPalette = euiPaletteColorBlind({ rotations: 2 });

const CHART_VIEW_OPTIONS = [
  {
    id: 'metrics',
    label: i18n.translate('metricsExperience.traces.healthMetricsView', {
      defaultMessage: 'Health metrics',
    }),
    iconType: 'visLine',
    'data-test-subj': 'tracesHealthMetricsToggle',
  },
  {
    id: 'latencyMap',
    label: i18n.translate('metricsExperience.traces.latencyMapView', {
      defaultMessage: 'Latency map',
    }),
    iconType: 'chartHeatmap',
    'data-test-subj': 'tracesLatencyMapToggle',
  },
];

function TraceMetricsGrid({
  fetchParams,
  fetch$: discoverFetch$,
  services,
  onBrushEnd,
  onFilter,
  actions,
  profileId,
  renderToggleActions,
  chartToolbarCss,
  isComponentVisible,
  breakdownField,
  onBreakdownFieldChange,
}: UnifiedMetricsGridProps) {
  const { query, dataSource, columns } = fetchParams;
  const esqlQuery = useEsqlQueryInfo({
    query: query && 'esql' in query ? query.esql : '',
  });

  const kqlFilters = useMemo(() => {
    if (query && 'query' in query && query.query) {
      return [`KQL("${query.query.replaceAll('"', '\\"')}")`];
    }
    return [];
  }, [query]);

  const filters = useMemo(() => {
    return [...esqlQuery.filters, ...kqlFilters];
  }, [esqlQuery.filters, kqlFilters]);

  const usedMetadataFields = useMemo(() => {
    return extractUsedMetadataFields({
      metadataFields: esqlQuery.metadataFields,
      filters,
    });
  }, [esqlQuery.metadataFields, filters]);

  const breakdownDataViewField = useMemo(
    () =>
      resolveBreakdownField({
        breakdownField,
        dataSource,
        columns,
      }),
    [breakdownField, dataSource, columns]
  );

  const handleBreakdownFieldChange = useCallback(
    (field: DataViewField | undefined) => {
      onBreakdownFieldChange?.(field?.name);
    },
    [onBreakdownFieldChange]
  );

  // When the flag is on, the latency map can be chosen next to the RED charts, which stay
  // the default. When it is off, the RED charts only, as before.
  const latencyMapEnabled = useFeatureFlag(FEATURE_FLAGS.IS_TRACES_LATENCY_MAP_ENABLED, false);
  // A query arriving with a selection (a shared URL, a reload) starts on the map that drew
  // it; the choice is otherwise kept per tab.
  const [chartView = 'metrics', setChartView] = useTracesRestorableState('chartView', () =>
    filters.some(isSelectionCondition) ? 'latencyMap' : undefined
  );
  const view: TracesChartView = latencyMapEnabled ? chartView : 'metrics';

  const toolbar = useMemo(
    () => ({
      toggleActions: renderToggleActions(),
      leftSide: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {latencyMapEnabled && (
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={i18n.translate('metricsExperience.traces.chartViewLegend', {
                  defaultMessage: 'Visualization type',
                })}
                buttonSize="compressed"
                idSelected={view}
                onChange={(id) => setChartView(id as TracesChartView)}
                options={CHART_VIEW_OPTIONS}
              />
            </EuiFlexItem>
          )}
          {view === 'metrics' && (
            <EuiFlexItem grow={false}>
              <UnifiedBreakdownFieldSelector
                dataSource={dataSource}
                breakdown={{ field: breakdownDataViewField }}
                onBreakdownFieldChange={handleBreakdownFieldChange}
                recommendedFields={TRACES_BREAKDOWN_RECOMMENDED_FIELDS}
                fieldsMetadata={services.fieldsMetadata}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    }),
    [
      renderToggleActions,
      latencyMapEnabled,
      view,
      setChartView,
      dataSource,
      breakdownDataViewField,
      handleBreakdownFieldChange,
      services.fieldsMetadata,
    ]
  );

  // The source's index pattern, including remote cluster prefixes (`remote:traces-*`).
  const indexPattern = dataSource.title || undefined;

  if (!indexPattern) {
    return undefined;
  }

  if (view === 'latencyMap') {
    return (
      <ChartsGrid
        id="tracesGrid"
        toolbarCss={chartToolbarCss}
        toolbar={toolbar}
        isComponentVisible={isComponentVisible}
      >
        <TracesLatencyMapView
          indexPattern={indexPattern}
          filters={filters}
          timeFrom={fetchParams.timeRange?.from}
          timeTo={fetchParams.timeRange?.to}
          services={services}
          actions={actions}
        />
      </ChartsGrid>
    );
  }

  return (
    <ChartsGrid
      id="tracesGrid"
      toolbarCss={chartToolbarCss}
      toolbar={toolbar}
      isComponentVisible={isComponentVisible}
    >
      <TraceMetricsProvider
        value={{
          indexes: indexPattern,
          filters,
          metadataFields: usedMetadataFields,
          services,
          onBrushEnd,
          onFilter,
          fetchParams,
          discoverFetch$,
          actions,
          profileId,
          breakdownField: breakdownDataViewField?.name,
        }}
      >
        <EuiPanel
          hasBorder={false}
          hasShadow={false}
          css={css`
            height: 100%;
            align-content: center;
          `}
        >
          <EuiFlexGrid columns={3} gutterSize="s">
            <EuiFlexItem>
              <LatencyChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <ErrorRateChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <ThroughputChart />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPanel>
      </TraceMetricsProvider>
    </ChartsGrid>
  );
}

const TraceMetricsGridWithServices = (props: UnifiedMetricsGridProps) => (
  <ExternalServicesProvider externalServices={props.externalServices}>
    <TraceMetricsGrid {...props} />
  </ExternalServicesProvider>
);

// eslint-disable-next-line import/no-default-export
export default withTracesRestorableState(TraceMetricsGridWithServices);
