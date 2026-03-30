/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensBaseLayer, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect, useMemo } from 'react';
import type { TimeRange } from '@kbn/data-plugin/common';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { NullableMetricUnit } from '../../../types';
import { useEsqlQueryInfo } from '../../../hooks';
import { getLensMetricFormat } from '../../../common/utils';
import type { UnifiedMetricsGridProps } from '../../../types';

interface ChartLayersFromEsqlProps {
  query: string;
  color?: string;
  unit?: NullableMetricUnit;
  timeRange: TimeRange;
  seriesType: LensSeriesLayer['seriesType'];
  services: UnifiedMetricsGridProps['services'];
  abortController?: AbortController;
}

export interface ChartLayersFromEsqlResult {
  layers: LensSeriesLayer[];
  loading: boolean;
  error?: Error;
}

export const useChartLayersFromEsql = ({
  query,
  timeRange,
  color,
  seriesType,
  services,
  unit,
  abortController,
}: ChartLayersFromEsqlProps): ChartLayersFromEsqlResult => {
  const queryInfo = useEsqlQueryInfo({ query });

  const [{ value: columns = [], loading, error }, fetchColumns] = useAsyncFn(
    (signal: AbortSignal) =>
      getESQLQueryColumns({
        esqlQuery: query,
        search: services.data.search.search,
        signal,
        timeRange,
      }),
    [query, services.data.search, timeRange]
  );

  useEffect(() => {
    const localAbortController = new AbortController();
    fetchColumns(localAbortController.signal);
    return () => {
      localAbortController.abort();
    };
  }, [fetchColumns, abortController]);

  const layers = useMemo<LensSeriesLayer[]>(() => {
    if (columns.length === 0) {
      return [];
    }

    const xAxisColumn = columns.find((col) => col.meta.type === 'date');
    const xAxis: LensSeriesLayer['xAxis'] = {
      type: 'dateHistogram',
      field: xAxisColumn?.name ?? '@timestamp',
    };

    const yAxis: LensBaseLayer[] = columns
      .filter(
        (col) => col.meta.type !== 'date' && !queryInfo.dimensions.some((dim) => dim === col.name)
      )
      .map((col) => ({
        label: col.name,
        value: col.name,
        compactValues: true,
        seriesColor: color,
        ...(unit ? getLensMetricFormat(unit) : {}),
      }));

    const hasDimensions = queryInfo.dimensions.length > 0;
    return [
      {
        type: 'series',
        seriesType,
        xAxis,
        yAxis,
        breakdown: hasDimensions ? queryInfo.dimensions : undefined,
      },
    ];
  }, [columns, queryInfo.dimensions, seriesType, color, unit]);

  return { layers, loading, error };
};
