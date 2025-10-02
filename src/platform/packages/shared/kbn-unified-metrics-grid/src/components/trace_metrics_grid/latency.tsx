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
import React from 'react';
import type { Observable } from 'rxjs';
import { chartPalette } from '.';
import { useLensProps } from '../chart/hooks/use_lens_props';
import { LensWrapper } from '../chart/lens_wrapper';
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
}: Props) => {
  const whereClauses = [...filters, 'processor.event == "transaction"'].map((filter) =>
    where(filter)
  );
  const query = from(indexes)
    .pipe(
      ...whereClauses,
      evaluate('duration_ms = ROUND(transaction.duration.us)/1000'),
      stats(
        'avg_duration = AVG(duration_ms) BY timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend) '
      ),
      keep('avg_duration, timestamp'),
      sort('timestamp')
    )
    .toString();
  console.log('### caue ~ LatencyChart ~ query:', query);

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
  });

  if (!latencyLensProps) {
    return null;
  }

  return (
    <LensWrapper
      size="s"
      lensProps={latencyLensProps}
      metricName={'Latency'}
      services={services}
      onBrushEnd={onBrushEnd}
      onFilter={onFilter}
      abortController={abortController}
    />
  );
};
