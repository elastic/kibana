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
import { AT_TIMESTAMP, EVENT_OUTCOME, PROCESSOR_EVENT, STATUS_CODE } from '@kbn/apm-types';
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
        ? stats(
            `failure = COUNT(*) WHERE ${EVENT_OUTCOME} == "failure", all = COUNT(*)  BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
          )
        : stats(
            `failure = COUNT(*) WHERE ${STATUS_CODE} == "Error", all = COUNT(*)  BY timestamp = BUCKET(${AT_TIMESTAMP}, 100, ?_tstart, ?_tend)`
          ),
      evaluate('error_rate = TO_DOUBLE(failure) / all'),
      keep('timestamp, error_rate'),
      sort('timestamp')
    )
    .toString();
}

export const ErrorRateChart = ({
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

  const errorRateLensProps = useLensProps({
    title: 'Error Rate',
    query,
    getTimeRange,
    seriesType: 'line',
    services,
    unit: 'percent',
    discoverFetch$,
    searchSessionId,
    color: chartPalette[6],
    abortController,
    chartRef,
  });

  if (!errorRateLensProps) {
    return null;
  }

  return (
    <ChartContainer size="s" ref={chartRef}>
      <LensWrapper
        lensProps={errorRateLensProps}
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
