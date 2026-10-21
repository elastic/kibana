/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, euiPaletteColorBlind } from '@elastic/eui';
import type { SparklinePoint } from '@kbn/apm-ui-shared';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { EntitySummary, type EntitySummaryProps } from '.';

export default {
  title: 'shared/EntitySummary',
  component: EntitySummary,
};

const palette = euiPaletteColorBlind({ rotations: 2 });
const now = Date.now();
const minute = 60 * 1000;

function makeSeries(fn: (i: number) => number | null): SparklinePoint[] {
  return Array.from({ length: 20 }, (_, i) => ({ x: now - (20 - i) * minute, y: fn(i) }));
}

const latencySeries = makeSeries((i) => 1000 + Math.sin(i / 3) * 120 + Math.random() * 60);
const throughputSeries = makeSeries((i) => 46 + Math.sin(i / 4) * 6 + Math.random() * 3);

// A service entity drives this story, but the component is entity-agnostic: `title`/`subtitle`/
// `metrics`/`links` carry no service-specific semantics, so hosts, containers, etc. map in the
// same way.
const baseProps: EntitySummaryProps = {
  title: 'checkoutService',
  subtitle: 'Synthtrace: service_map · go',
  titleHref: 'https://localhost:5601/app/apm/services/checkoutService/overview',
  icon: <EuiIcon type="compute" size="xl" aria-hidden={true} />,
  metrics: [
    {
      label: 'Latency (avg)',
      valueLabel: '1,000 ms',
      color: palette[1],
      series: latencySeries,
    },
    {
      label: 'Throughput',
      valueLabel: '46.6 tpm',
      color: palette[2],
      series: throughputSeries,
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
      id: 'alerts',
      label: 'Active alerts',
      iconType: 'bell',
      external: true,
      badgeLabel: 1,
      badgeColor: 'danger',
      'data-test-subj': 'linkActiveAlerts',
    },
    {
      id: 'slos',
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

// Horizontal layout (`metricsDirection="row"`, the default): metrics sit side by side.
export const Default: StoryFn = () => <EntitySummary {...baseProps} />;

// Stacked layout (`metricsDirection="column"`): charts line up vertically. This is what the
// Discover summary popover uses.
export const Stacked: StoryFn = () => <EntitySummary {...baseProps} metricsDirection="column" />;

export const Loading: StoryFn = () => (
  <EntitySummary
    {...baseProps}
    isLoading
    metrics={baseProps.metrics.map((metric) => ({ ...metric, series: null }))}
  />
);
