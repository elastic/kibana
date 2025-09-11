/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import { EuiFlexGrid, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import type { Observable } from 'rxjs';
import { Chart } from './chart';

export type MetricsGridProps = Pick<
  ChartSectionProps,
  'searchSessionId' | 'services' | 'onBrushEnd' | 'onFilter' | 'abortController' | 'requestParams'
> & {
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  columns: EuiFlexGridProps['columns'];
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
} & (
    | {
        pivotOn: 'metric';
        fields: MetricField[];
      }
    | {
        pivotOn: 'dimension';
        fields: MetricField;
      }
  );

export const MetricsGrid = ({
  fields,
  searchSessionId,
  onBrushEnd,
  onFilter,
  dimensions,
  pivotOn,
  services,
  columns,
  abortController,
  requestParams,
  discoverFetch$,
  filters = [],
}: MetricsGridProps) => {
  const { euiTheme } = useEuiTheme();

  const chartSize = useMemo(() => (columns === 2 || columns === 4 ? 's' : 'm'), [columns]);

  const colorPalette = useMemo(
    () => Object.values(euiTheme.colors.vis).slice(0, 10),
    [euiTheme.colors.vis]
  );

  const rows = useMemo(() => {
    return pivotOn === 'metric'
      ? fields.map((field, i) => ({ key: `${field.name}-${i}`, metric: field }))
      : dimensions.map((dim, i) => ({ key: `${dim}-${i}`, metric: fields }));
  }, [pivotOn, fields, dimensions]);

  return (
    <EuiFlexGrid columns={columns} gutterSize="s" data-test-subj="unifiedMetricsExperienceGrid">
      {rows.map(({ key, metric }, index) => (
        <EuiFlexItem key={key}>
          <Chart
            metric={metric}
            size={chartSize}
            color={colorPalette[index % colorPalette.length]}
            dimensions={dimensions}
            discoverFetch$={discoverFetch$}
            requestParams={requestParams}
            services={services}
            abortController={abortController}
            searchSessionId={searchSessionId}
            filters={filters}
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
