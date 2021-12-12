/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiCard, EuiStat } from '@elastic/eui';
import { DataType, formatNumber, Metric } from '../lib';

/*
 * Displays metadata for a metric.
 */
export const MetricCardFooter: FunctionComponent<{
  testSubjectName: string;
  title: string;
  description: string;
}> = ({ testSubjectName, title, description }) => {
  return (
    <EuiStat
      data-test-subj={testSubjectName}
      title={title}
      titleSize="xxs"
      description={description}
      reverse
    />
  );
};

/*
 * Displays a metric with the correct format.
 */
export const MetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name } = metric;
  if (name === 'Delay') {
    return (
      <EuiCard
        data-test-subj={`serverMetric-${formatMetricId(metric)}`}
        title={formatMetric(metric)}
        textAlign="left"
        description={`${name} avg`}
        footer={
          metric.meta && (
            <MetricCardFooter
              testSubjectName="serverMetricMeta"
              title={formatDelayFooterTitle(metric.meta.value as number[], metric.meta.type)}
              description={metric.meta.description}
            />
          )
        }
      />
    );
  } else if (name === 'Load') {
    return (
      <EuiCard
        data-test-subj={`serverMetric-${formatMetricId(metric)}`}
        title={formatMetric(metric)}
        textAlign="left"
        description={name}
        footer={
          metric.meta && (
            <MetricCardFooter
              testSubjectName="serverMetricMeta"
              title={metric.meta.title}
              description={metric.meta.description}
            />
          )
        }
      />
    );
  } else if (name === 'Response time avg') {
    return (
      <EuiCard
        data-test-subj={`serverMetric-${formatMetricId(metric)}`}
        title={formatMetric(metric)}
        textAlign="left"
        description={name}
        footer={
          metric.meta && (
            <MetricCardFooter
              testSubjectName="serverMetricMeta"
              title={formatNumber(metric.meta.value![0], metric.meta.type)}
              description={metric.meta.description}
            />
          )
        }
      />
    );
  } else {
    return (
      <EuiCard
        data-test-subj={`serverMetric-${formatMetricId(metric)}`}
        textAlign="left"
        title={formatMetric(metric)}
        description={name}
      />
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

const formatDelayFooterTitle = (values: number[], type?: DataType) => {
  return `
  50: ${formatNumber(values[0], type)};
  95: ${formatNumber(values[1], type)};
  99: ${formatNumber(values[2], type)}`;
};
