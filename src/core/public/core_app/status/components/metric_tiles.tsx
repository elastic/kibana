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
const MetricCardFooter: FunctionComponent<{
  title: string;
  description: string;
}> = ({ title, description }) => {
  return (
    <EuiStat
      data-test-subj="serverMetricMeta"
      title={title}
      titleSize="xxs"
      description={description}
      reverse
    />
  );
};

const DelayMetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name, meta } = metric;
  return (
    <EuiCard
      data-test-subj={`serverMetric-${formatMetricId(name)}`}
      title={formatMetric(metric)}
      textAlign="left"
      description={`${name} avg`}
      footer={
        meta?.value && (
          <MetricCardFooter
            title={formatDelayFooterTitle(meta.value, meta.type)}
            description={meta.description}
          />
        )
      }
    />
  );
};

const LoadMetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name, meta } = metric;
  return (
    <EuiCard
      data-test-subj={`serverMetric-${formatMetricId(name)}`}
      title={formatMetric(metric)}
      textAlign="left"
      description={name}
      footer={meta && <MetricCardFooter title={meta.title} description={meta.description} />}
    />
  );
};

const ResponseTimeMetric: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name, meta } = metric;
  return (
    <EuiCard
      data-test-subj={`serverMetric-${formatMetricId(name)}`}
      title={formatMetric(metric)}
      textAlign="left"
      description={name}
      footer={
        meta?.value &&
        Array.isArray(meta.value) && (
          <MetricCardFooter
            title={formatNumber(meta.value[0], meta.type)}
            description={meta.description}
          />
        )
      }
    />
  );
};

/*
 * Displays a metric with the correct format.
 */
export const MetricTile: FunctionComponent<{ metric: Metric }> = ({ metric }) => {
  const { name } = metric;
  switch (name) {
    case 'Delay':
      return <DelayMetricTile metric={metric} />;
    case 'Load':
      return <LoadMetricTile metric={metric} />;
    case 'Response time avg':
      return <ResponseTimeMetric metric={metric} />;
    default:
      return (
        <EuiCard
          data-test-subj={`serverMetric-${formatMetricId(name)}`}
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

// formatting helper functions

const formatMetric = ({ value, type }: Metric) => {
  const metrics = Array.isArray(value) ? value : [value];
  return metrics.map((metric) => formatNumber(metric, type)).join(', ');
};

const formatMetricId = (name: Metric['name']) => {
  return name.toLowerCase().replace(/[ ]+/g, '-');
};

const formatDelayFooterTitle = (values: number[], type?: DataType) => {
  return `
  50: ${formatNumber(values[0], type)};
  95: ${formatNumber(values[1], type)};
  99: ${formatNumber(values[2], type)}`;
};
