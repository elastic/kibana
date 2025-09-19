/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { createESQLQuery } from '../../common/utils/esql/create_esql_query';
import type { LensWrapperProps } from './lens_wrapper';
import { LensWrapper } from './lens_wrapper';
import { useLensProps } from './hooks/use_lens_props';

const ChartSizes = {
  s: 230,
  m: 350,
};

export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<ChartSectionProps, 'searchSessionId' | 'requestParams'> &
  Omit<LensWrapperProps, 'lensProps' | 'esqlQuery'> & {
    dimensions: string[];
    color?: string;
    size?: ChartSize;
    filters?: Array<{ field: string; value: string }>;
    discoverFetch$: Observable<UnifiedHistogramInputMessage>;
    onViewDetails: (metric: MetricField, esqlQuery: string) => void;
  };

const LensWrapperMemo = React.memo(LensWrapper);

export const Chart: React.FC<ChartProps> = ({
  abortController,
  metric,
  color,
  services,
  searchSessionId,
  onBrushEnd,
  onFilter,
  onViewDetails,
  requestParams,
  discoverFetch$,
  dimensions = [],
  size = 'm',
  filters = [],
}) => {
  const { euiTheme } = useEuiTheme();

  const { getTimeRange } = requestParams;

  const esqlQuery = useMemo(() => {
    const isSupported = metric.type !== 'unsigned_long' && metric.type !== 'histogram';
    if (!isSupported) {
      return '';
    }
    return createESQLQuery({
      metricField: metric.name,
      instrument: metric.instrument,
      index: metric.index,
      dimensions,
      filters,
    });
  }, [metric.type, metric.name, metric.instrument, metric.index, dimensions, filters]);

  const lensProps = useLensProps({
    title: metric.name,
    query: esqlQuery,
    getTimeRange,
    color,
    seriesType: dimensions.length > 0 ? 'line' : 'area',
    services,
    searchSessionId,
    unit: metric.unit,
    discoverFetch$,
    abortController,
  });

  return (
    <div
      css={css`
        height: ${ChartSizes[size]}px;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      {lensProps ? (
        <LensWrapperMemo
          metric={metric}
          lensProps={lensProps}
          services={services}
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
          abortController={abortController}
          onViewDetails={onViewDetails}
        />
      ) : (
        <EuiFlexGroup
          style={{ height: '100%' }}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};
