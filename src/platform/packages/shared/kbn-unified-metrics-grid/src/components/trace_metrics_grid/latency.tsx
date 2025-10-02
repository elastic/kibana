/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluate, from, keep, sort, stats, where } from '@kbn/esql-composer';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useRef } from 'react';
import type { Observable } from 'rxjs';
import { AT_TIMESTAMP, DURATION, PROCESSOR_EVENT, TRANSACTION_DURATION } from '@kbn/apm-types';
import type { DataSource } from '.';
import { chartPalette } from '.';
import { useLensProps } from '../chart/hooks/use_lens_props';
import { LensWrapper } from '../chart/lens_wrapper';
import { ChartContainer } from '../chart_container';
interface Props {
  indexes: string;
  getTimeRange: ChartSectionProps['requestParams']['getTimeRange'];
  services: ChartSectionProps['services'];
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  searchSessionId?: string;
  abortController?: AbortController;
  onBrushEnd: ChartSectionProps['onBrushEnd'];
  onFilter: ChartSectionProps['onFilter'];
  filters: string[];
  dataSource: DataSource;
}

function getQuery(dataSource: DataSource, indexes: string, filters: string[]) {
  const whereClauses = [...filters, `${PROCESSOR_EVENT} == "transaction"`].map((filter) =>
    where(filter)
  );
  return from(indexes)
    .pipe(
      ...whereClauses,
      dataSource === 'apm'
        ? evaluate(`duration_ms = ROUND(${TRANSACTION_DURATION})/1000`) // apm duration is in us
        : evaluate(`duration_ms = ROUND(${DURATION})/1000/1000`), // otel duration is in ns
      stats(
        `avg_duration = AVG(duration_ms) BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
      ),
      keep('avg_duration, timestamp'),
      sort('timestamp')
    )
    .toString();
}

export const LatencyChart = ({
  indexes,
  getTimeRange,
  services,
  discoverFetch$,
  searchSessionId,
  abortController,
  onBrushEnd,
  onFilter,
  filters,
  dataSource,
}: Props) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const query = getQuery(dataSource, indexes, filters);

  const latencyLensProps = useLensProps({
    title: 'Latency',
    query,
    getTimeRange,
    seriesType: 'line',
    services,
    unit: 'ms',
    discoverFetch$,
    searchSessionId,
    color: chartPalette[2],
    abortController,
    chartRef,
  });

  if (!latencyLensProps) {
    return undefined;
  }

  return (
    <ChartContainer size="s" ref={chartRef}>
      <LensWrapper
        lensProps={latencyLensProps}
        services={services}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        abortController={abortController}
        syncCursor
        syncTooltips
      />
    </ChartContainer>
  );
};
