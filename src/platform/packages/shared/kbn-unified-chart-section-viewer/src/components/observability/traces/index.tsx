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
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { UnifiedBreakdownFieldSelector, resolveBreakdownField } from '@kbn/unified-histogram';
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

const CHART_VIEW_OPTIONS: Array<EuiButtonGroupOptionProps & { id: TracesChartView }> = [
  {
    id: 'latencyMap',
    label: i18n.translate('metricsExperience.traces.latencyMapView', {
      defaultMessage: 'Latency map',
    }),
    iconType: 'chartHeatmap',
    'data-test-subj': 'tracesLatencyMapToggle',
  },
  {
    id: 'metrics',
    label: i18n.translate('metricsExperience.traces.healthMetricsView', {
      defaultMessage: 'Health metrics',
    }),
    iconType: 'chartLine',
    'data-test-subj': 'tracesHealthMetricsToggle',
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
  isChartLoading,
  breakdownField,
  onBreakdownFieldChange,
  expandedDocId,
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

  // When the flag is on, the latency map sits next to the RED charts and is the default
  // view. When it is off, the RED charts only, as before. The map keeps its selection in
  // the ES|QL query, so only an ES|QL session that can be rewritten gets it.
  const latencyMapEnabled = useFeatureFlag(FEATURE_FLAGS.IS_TRACES_LATENCY_MAP_ENABLED, false);
  const latencyMapAvailable =
    latencyMapEnabled && !!query && 'esql' in query && !!actions.updateESQLQuery;
  // The map is the default view when it is available (which also covers a query arriving
  // with a selection); the choice is kept per tab. Without the map, the RED charts as ever.
  const [chartView = 'latencyMap', setChartView] = useTracesRestorableState(
    'chartView',
    'latencyMap'
  );
  const view: TracesChartView = latencyMapAvailable ? chartView : 'metrics';

  const toolbar = useMemo(
    () => ({
      toggleActions: renderToggleActions(),
      leftSide: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {latencyMapAvailable && (
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
      latencyMapAvailable,
      view,
      setChartView,
      dataSource,
      breakdownDataViewField,
      handleBreakdownFieldChange,
      services.fieldsMetadata,
    ]
  );

  // What Discover applies to its own query besides the text: its filter pills, its ES|QL
  // controls, its search session. The map's queries run under the same, so its counts and
  // its example spans are the documents' - and they are not refetched for a new object.
  const searchContext = useMemo(
    () => ({
      filters: fetchParams.filters,
      esqlVariables: fetchParams.esqlVariables,
      timeRange: fetchParams.timeRange,
      searchSessionId: fetchParams.searchSessionId,
    }),
    [
      fetchParams.filters,
      fetchParams.esqlVariables,
      fetchParams.timeRange,
      fetchParams.searchSessionId,
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
          relativeTimeRange={fetchParams.relativeTimeRange}
          searchContext={searchContext}
          services={services}
          actions={actions}
          isChartLoading={isChartLoading}
          expandedDocId={expandedDocId}
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
