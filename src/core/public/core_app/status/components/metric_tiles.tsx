/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
