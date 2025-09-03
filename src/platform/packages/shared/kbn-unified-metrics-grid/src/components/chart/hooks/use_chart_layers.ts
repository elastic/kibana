/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensBaseLayer, LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import useAsync from 'react-use/lib/useAsync';
import { fetchFieldsFromESQL } from '@kbn/esql-editor';
import { useMemo } from 'react';
import type { TimeRange } from '@kbn/data-plugin/common';
import { useEsqlQueryInfo } from '../../../hooks';

export const useChartLayers = ({
  query,
  timeRange,
  color,
  seriesType,
  services,
}: {
  query: string;
  color?: string;
  unit?: string;
  timeRange: TimeRange;
  seriesType: LensSeriesLayer['seriesType'];
  services: ChartSectionProps['services'];
} & Pick<ChartSectionProps, 'services'>): Array<LensSeriesLayer> => {
  const queryInfo = useEsqlQueryInfo({ query });

  const { value: table } = useAsync(
    () =>
      fetchFieldsFromESQL(
        {
          esql: `${query} | LIMIT 0`,
        },
        services.expressions,
        timeRange,
        undefined,
        '@timestamp'
      ),
    [query, services!.expressions, timeRange]
  );

  const columns = useMemo(() => table?.columns ?? [], [table?.columns]);

  const layers = useMemo<LensSeriesLayer[]>(() => {
    const xAxisColumn = columns.find((col) => col.meta.type === 'date');
    const xAxis = xAxisColumn?.name ?? '@timestamp';

    const yAxis: LensBaseLayer[] = columns
      .filter(
        (col) => col.meta.type !== 'date' && !queryInfo.dimensions.some((dim) => dim === col.name)
      )
      .map((col) => ({
        label: col.name,
        value: col.name,
        decimals: 1,
        compactValues: true,
        seriesColor: color,
      }));

    const hasDimensions = queryInfo.dimensions.length > 0;
    return [
      {
        type: 'series',
        seriesType,
        xAxis,
        yAxis,
        breakdown: hasDimensions ? 'dimensions' : undefined,
      },
    ];
  }, [columns, queryInfo.dimensions, seriesType, color]);

  return layers;
};
