/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, keep, sort, stats, where } from '@kbn/esql-composer';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import React, { useRef } from 'react';
import type { Observable } from 'rxjs';
import { AT_TIMESTAMP, PROCESSOR_EVENT } from '@kbn/apm-types';
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
}

export const ThroughputChart = ({
  indexes,
  getTimeRange,
  services,
  discoverFetch$,
  searchSessionId,
  abortController,
  onBrushEnd,
  onFilter,
  filters,
}: Props) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const whereClauses = [...filters, `${PROCESSOR_EVENT} == "transaction"`].map((filter) =>
    where(filter)
  );
  const query = from(indexes)
    .pipe(
      ...whereClauses,
      stats(`throughput = COUNT(*) BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`),
      keep('timestamp, throughput'),
      sort('timestamp')
    )
    .toString();

  const throughputLensProps = useLensProps({
    title: 'Throughput',
    query,
    getTimeRange,
    seriesType: 'line',
    services,
    unit: 'count',
    discoverFetch$,
    searchSessionId,
    color: chartPalette[0],
    abortController,
    chartRef,
  });

  if (!throughputLensProps) {
    return null;
  }

  return (
    <ChartContainer size="s" ref={chartRef}>
      <LensWrapper
        lensProps={throughputLensProps}
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
