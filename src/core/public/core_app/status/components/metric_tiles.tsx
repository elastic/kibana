/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiCard } from '@elastic/eui';
import { formatNumber, Metric } from '../lib';

/*
 * Displays a metric with the correct format.
 */
export const MetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name } = metric;
  return (
    <EuiCard
      data-test-subj={`serverMetric-${formatMetricId(metric)}`}
      layout="horizontal"
      title={formatMetric(metric)}
      description={name}
    />
  );
};

/*
 * Wrapper component that simply maps each metric to MetricTile inside a FlexGroup
 */
export const MetricTiles: FunctionComponent<{ metrics: Metric[] }> = ({ metrics }) => (
  <EuiFlexGrid columns={3}>
    {metrics.map((metric) => (
      <EuiFlexItem key={metric.name} data-test-subj="serverMetric">
        <MetricTile metric={metric} />
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

const formatMetric = ({ value, type }: Metric) => {
  const metrics = Array.isArray(value) ? value : [value];
  return metrics.map((metric) => formatNumber(metric, type)).join(', ');
};

const formatMetricId = ({ name }: Metric) => {
  return name.toLowerCase().replace(/[ ]+/g, '-');
};
