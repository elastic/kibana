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
import type { TraceIndexes } from '@kbn/discover-utils/src';
import { useFetch } from '@kbn/unified-histogram';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { Subject } from 'rxjs';
import { useEsqlQueryInfo } from '../../hooks';
import { store } from '../../store';
import { Chart } from '../chart';
import { getErrorRateChart, getLatencyChart, getThroughputChart } from './trace_charts_definition';

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
  indexes,
  query,
  dataSource,
}: ChartSectionProps & {
  indexes: TraceIndexes;
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

  const charts = useMemo(() => {
    if (!indexes.apm.traces) {
      return [];
    }
    return [
      getLatencyChart({ dataSource, indexes: indexes.apm.traces, filters }),
      getErrorRateChart({ dataSource, indexes: indexes.apm.traces, filters }),
      getThroughputChart({ dataSource, indexes: indexes.apm.traces, filters }),
    ];
  }, [dataSource, indexes.apm.traces, filters]);

  if (!indexes.apm.traces) {
    return undefined;
  }

  return (
    <Provider store={store}>
      <EuiPanel
        hasBorder={false}
        hasShadow={false}
        css={css`
          height: 100%;
          align-content: center;
        `}
      >
        <EuiFlexGrid columns={3}>
          {charts.map(({ id, ...chartProps }) => (
            <EuiFlexItem key={id}>
              <Chart
                requestParams={requestParams}
                searchSessionId={searchSessionId}
                abortController={abortController}
                onBrushEnd={onBrushEnd}
                onFilter={onFilter}
                services={services}
                discoverFetch$={discoverFetch$}
                size="s"
                {...chartProps}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPanel>
    </Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export default TraceMetricsGrid;
