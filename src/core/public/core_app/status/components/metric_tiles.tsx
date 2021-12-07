/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiPanel,
  EuiStat,
  EuiIcon,
  EuiFlexGroup,
} from '@elastic/eui';
import { formatNumber, Metric } from '../lib';

/*
 * Displays a metric with the correct format.
 */
export const MetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name } = metric;
  if (name === 'Mean delay') {
    return (
      // extract into a DelayMetricTile
      <EuiPanel hasShadow={true} hasBorder={false} paddingSize="m">
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`serverMetric-${formatMetricId(metric)}`}
            title={formatMetric(metric)}
            titleSize="l"
            description={`${name}`}
            reverse
          >
            <EuiIcon type="empty" />
          </EuiStat>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`serverMetric-${formatMetricId(metric.meta!)}`}
            title={`50: ${formatNumber(
              metric.meta!.value[0],
              metric.meta!.type
            )}; 95: ${formatNumber(metric.meta!.value[1], metric.meta!.type)}; 99: ${formatNumber(
              metric.meta!.value[2],
              metric.meta!.type
            )};`}
            titleSize="xs"
            description={`${metric.meta!.name}`}
            reverse
          />
        </EuiFlexItem>
      </EuiPanel>
    );
  } else if (name === 'Load') {
    // extract into a LoadMetricTile
    return (
      <EuiPanel hasShadow={true} hasBorder={false} paddingSize="m">
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`serverMetric-${formatMetricId(metric)}`}
            title={formatMetric(metric)}
            titleSize="l"
            description={`Average ${name}`}
            reverse
          >
            <EuiIcon type="empty" />
          </EuiStat>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`serverMetric-${formatMetricId(metric.meta!)}`}
            title={''}
            titleSize="xs"
            description={metric.meta!.value.join('; ')}
            reverse
          />
        </EuiFlexItem>
      </EuiPanel>
    );
  } else {
    return (
      <EuiPanel hasShadow={true} hasBorder={false} paddingSize="m">
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`serverMetric-${formatMetricId(metric)}`}
            title={formatMetric(metric)}
            titleSize="l"
            description={name}
            reverse
          >
            <EuiIcon type="empty" />
          </EuiStat>
        </EuiFlexItem>
      </EuiPanel>
    );
  }
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
