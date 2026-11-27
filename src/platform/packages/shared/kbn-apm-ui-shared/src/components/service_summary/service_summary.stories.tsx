/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, euiPaletteColorBlind } from '@elastic/eui';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { ServiceSummary, type ServiceSummaryProps } from '.';
import type { SparklinePoint } from '../sparkline/utils';

export default {
  title: 'shared/ServiceSummary',
  component: ServiceSummary,
};

const palette = euiPaletteColorBlind({ rotations: 2 });
const now = Date.now();
const minute = 60 * 1000;

function makeSeries(fn: (i: number) => number | null): SparklinePoint[] {
  return Array.from({ length: 20 }, (_, i) => ({ x: now - (20 - i) * minute, y: fn(i) }));
}

const latencySeries = makeSeries((i) => 1000 + Math.sin(i / 3) * 120 + Math.random() * 60);
const latencyComparison = makeSeries((i) => 940 + Math.sin(i / 3) * 100 + Math.random() * 40);
const throughputSeries = makeSeries((i) => 46 + Math.sin(i / 4) * 6 + Math.random() * 3);
const throughputComparison = makeSeries((i) => 48 + Math.sin(i / 4) * 6 + Math.random() * 3);

const baseProps: ServiceSummaryProps = {
  serviceName: 'checkoutService',
  environment: 'Synthtrace: service_map',
  agentName: 'go',
  serviceHref: 'https://localhost:5601/app/apm/services/checkoutService/overview',
  icon: <EuiIcon type="compute" size="xl" aria-hidden={true} />,
  health: {
    activeAlertCount: 1,
    slo: { status: 'violated', violatedCount: 1 },
  },
  metrics: [
    {
      label: 'Latency (avg)',
      valueLabel: '1,000 ms',
      color: palette[1],
      comparisonColor: palette[11],
      series: latencySeries,
      comparisonSeries: latencyComparison,
      change: { label: '6.25%', direction: 'increase', evaluation: 'bad' },
    },
    {
      label: 'Throughput',
      valueLabel: '46.6 tpm',
      color: palette[2],
      comparisonColor: palette[12],
      series: throughputSeries,
      comparisonSeries: throughputComparison,
      change: { label: '2.1%', direction: 'decrease', evaluation: 'neutral' },
    },
    {
      label: 'Error rate',
      valueLabel: 'N/A',
      color: palette[3],
      series: null,
    },
  ],
  links: [
    {
      label: 'Active alerts',
      iconType: 'bell',
      external: true,
      badgeLabel: 1,
      badgeColor: 'danger',
      'data-test-subj': 'linkActiveAlerts',
    },
    {
      label: 'SLOs',
      iconType: 'chartGauge',
      external: true,
      badgeLabel: 2,
      badgeColor: 'danger',
      'data-test-subj': 'linkSlos',
    },
  ],
  onClose: () => {},
  onFilterFor: () => {},
  onFilterOut: () => {},
  onCopyValue: () => {},
};

export const DesignAWithSparklines: StoryFn = () => <ServiceSummary {...baseProps} />;

export const DesignBWithoutSparklines: StoryFn = () => (
  <ServiceSummary {...baseProps} showSparklines={false} />
);

export const Healthy: StoryFn = () => (
  <ServiceSummary
    {...baseProps}
    health={{ activeAlertCount: 0, slo: { status: 'healthy' } }}
    metrics={baseProps.metrics.map((metric) => ({ ...metric, change: undefined }))}
  />
);

export const Loading: StoryFn = () => (
  <ServiceSummary
    {...baseProps}
    isLoading
    metrics={baseProps.metrics.map((metric) => ({ ...metric, series: null }))}
  />
);
