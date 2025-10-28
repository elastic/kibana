/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiFlexGrid, EuiFlexItem, EuiPanel, euiPaletteColorBlind } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFetch } from '@kbn/unified-histogram';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { Subject } from 'rxjs';
import { TraceMetricsProvider } from '../../context/trace_metrics_context';
import { useEsqlQueryInfo } from '../../hooks';
import { store } from '../../store';
import { ErrorRateChart } from './error_rate';
import { LatencyChart } from './latency';
import { ThroughputChart } from './throughput';
import { MetricsGridWrapper } from '../metrics_grid_wrapper';

export const chartPalette = euiPaletteColorBlind({ rotations: 2 });

export type DataSource = 'apm' | 'otel';

function TraceMetricsGrid({
  requestParams,
  services,
  input$: originalInput$,
  searchSessionId,
  onBrushEnd,
  onFilter,
  abortController,
  query,
  dataSource,
  renderToggleActions,
  chartToolbarCss,
  isComponentVisible,
  dataView,
}: ChartSectionProps & {
  dataSource: DataSource;
}) {
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

  const { updateTimeRange } = requestParams;

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const discoverFetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
  });

  const indexPattern = dataView?.getIndexPattern();

  if (!indexPattern) {
    return undefined;
  }

  return (
    <Provider store={store}>
      <MetricsGridWrapper
        indexPattern={indexPattern}
        renderToggleActions={renderToggleActions}
        chartToolbarCss={chartToolbarCss}
        requestParams={requestParams}
        fields={[]}
        isComponentVisible={isComponentVisible}
        hideRightSideActions
        hideDimensionsSelector
      >
        <TraceMetricsProvider
          value={{
            dataSource,
            indexes: indexPattern,
            filters,
            requestParams,
            services,
            searchSessionId,
            abortController,
            onBrushEnd,
            onFilter,
            discoverFetch$,
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
      </MetricsGridWrapper>
    </Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export default TraceMetricsGrid;
