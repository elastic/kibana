/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensBaseLayer, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import useAsync from 'react-use/lib/useAsync';
import { useMemo } from 'react';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { MetricUnit } from '@kbn/metrics-experience-plugin/common/types';
import { useEsqlQueryInfo } from '../../../hooks';
import { DIMENSIONS_COLUMN, getLensMetricFormat } from '../../../common/utils';

export const useChartLayersFromEsql = ({
  query,
  timeRange,
  color,
  seriesType,
  services,
  unit,
  abortController,
}: {
  query: string;
  color?: string;
  unit?: MetricUnit;
  seriesType: LensSeriesLayer['seriesType'];
  services: ChartSectionProps['services'];
  abortController?: AbortController;
} & Pick<ChartSectionProps, 'services' | 'timeRange'>): LensSeriesLayer[] => {
  const queryInfo = useEsqlQueryInfo({ query });

  const { value: columns = [] } = useAsync(
    () =>
      getESQLQueryColumns({
        esqlQuery: query,
        search: services.data.search.search,
        signal: abortController?.signal,
        timeRange,
      }),

    [query, services.data.search, abortController, timeRange]
  );

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
        (col) =>
          col.name !== DIMENSIONS_COLUMN &&
          col.meta.type !== 'date' &&
          !queryInfo.dimensions.some((dim) => dim === col.name)
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
        breakdown: hasDimensions
          ? queryInfo.dimensions.length === 1
            ? queryInfo.dimensions[0]
            : DIMENSIONS_COLUMN
          : undefined,
      },
    ];
  }, [columns, queryInfo.dimensions, seriesType, color, unit]);

  return layers;
};
