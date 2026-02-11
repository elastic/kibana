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
import React, { useMemo } from 'react';
import { TraceMetricsProvider } from './context/trace_metrics_context';
import { useEsqlQueryInfo } from '../../../hooks/use_esql_query_info';
import { ErrorRateChart } from './error_rate';
import { LatencyChart } from './latency';
import { ThroughputChart } from './throughput';
import { ChartsGrid } from '../../charts_grid';
import type { UnifiedMetricsGridProps } from '../../../types';
import { extractUsedMetadataFields } from '../../../utils';

export const chartPalette = euiPaletteColorBlind({ rotations: 2 });

function TraceMetricsGrid({
  fetchParams,
  fetch$: discoverFetch$,
  services,
  onBrushEnd,
  onFilter,
  actions,
  renderToggleActions,
  chartToolbarCss,
  isComponentVisible,
}: UnifiedMetricsGridProps) {
  const { query, dataView } = fetchParams;
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

  const toolbar = useMemo(
    () => ({
      toggleActions: renderToggleActions(),
    }),
    [renderToggleActions]
  );

  const indexPattern = dataView?.getIndexPattern();

  if (!indexPattern) {
    return undefined;
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

// eslint-disable-next-line import/no-default-export
export default TraceMetricsGrid;
