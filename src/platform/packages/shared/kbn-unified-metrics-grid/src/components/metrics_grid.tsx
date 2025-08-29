/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiLoadingChart, EuiFlexGroup, EuiText } from '@elastic/eui';
import { MetricChart } from './metric_chart';

interface MetricField {
  name: string;
  index: string;
  dimensions: Array<{ name: string; type: string; description?: string }>;
  type: string;
  timeSeriesMetric?: string;
  unit?: string;
  brief?: string;
  stability?: 'stable' | 'beta' | 'experimental';
}

type MetricsGridProps = {
  timeRange: { from?: string; to?: string };
  loading: boolean;
  searchTerm: string;
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  displayDensity?: 'normal' | 'compact' | 'row';
  headerActions?: {
    hasExploreAction?: boolean;
    hasMetricsInsightsAction?: boolean;
  };
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
  timeRange,
  loading,
  searchTerm,
  dimensions,
  pivotOn,
  filters = [],
  displayDensity = 'normal',
  headerActions,
}: MetricsGridProps) => {
  const getColumns = (): 1 | 2 | 3 | 4 => {
    return Array.isArray(fields)
      ? ((fields?.length >= 4 ? 4 : fields?.length) as 1 | 2 | 3 | 4)
      : 1;
  };

  if (loading) {
    return (
      <EuiFlexGroup
        data-test-subj="loading-metrics-charts"
        justifyContent="center"
        alignItems="center"
        style={{ minHeight: '400px' }}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (pivotOn === 'metric' && fields.length === 0) {
    return (
      <EuiText textAlign="center" color="subdued">
        {i18n.translate('metricsExperience.metricsGrid.noMetricsFoundMatchingTextLabel', {
          defaultMessage: 'No metrics found matching "{searchTerm}"',
          values: { searchTerm },
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGrid
      data-test-subj="metrics-grid"
      columns={getColumns()}
      gutterSize="l"
      style={{ margin: '16px' }}
    >
      {pivotOn === 'metric'
        ? fields.map((field, index) => (
            <EuiFlexItem
              key={`${field.name}-${displayDensity}`}
              data-test-subj={`metric-chart-${field.name}`}
            >
              <MetricChart
                metric={field}
                timeRange={timeRange}
                dimensions={dimensions}
                filters={filters}
                colorIndex={index}
                displayDensity={displayDensity}
                data-test-subj={`metric-chart-${field.name}`}
                headerActions={headerActions}
              />
            </EuiFlexItem>
          ))
        : dimensions.map((dimension, index) => (
            <EuiFlexItem key={`${dimension}-${displayDensity}`}>
              <MetricChart
                metric={fields}
                timeRange={timeRange}
                byDimension={dimension}
                dimensions={[dimension]}
                filters={filters}
                colorIndex={index}
                displayDensity={displayDensity}
              />
            </EuiFlexItem>
          ))}
    </EuiFlexGrid>
  );
};
