/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGrid, EuiFlexItem, EuiLoadingChart, EuiFlexGroup, EuiText } from '@elastic/eui';
import React from 'react';
import type { MetricField } from '../../common/types';
import { MetricChart } from './metric_chart';

type MetricsGridProps = {
  timeRange: { from?: string; to?: string };
  loading: boolean;
  searchTerm: string;
  filters?: Array<{ field: string; value: string }>;
  dimensions: string[];
  displayDensity?: 'normal' | 'compact' | 'row';
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
}: MetricsGridProps) => {
  // Determine number of columns based on display density
  const getColumns = () => {
    switch (displayDensity) {
      case 'compact':
        return 4;
      case 'row':
        return 1;
      case 'normal':
      default:
        return 3;
    }
  };

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (pivotOn === 'metric' && fields.length === 0) {
    return (
      <EuiText textAlign="center" color="subdued">
        No metrics found matching &quot;{searchTerm}&quot;
      </EuiText>
    );
  }

  return (
    <EuiFlexGrid columns={getColumns()} gutterSize="s">
      {pivotOn === 'metric'
        ? fields.map((field, index) => (
            <EuiFlexItem key={`${field.name}-${displayDensity}`}>
              <MetricChart
                metric={field}
                timeRange={timeRange}
                dimensions={dimensions}
                filters={filters}
                colorIndex={index}
                displayDensity={displayDensity}
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
