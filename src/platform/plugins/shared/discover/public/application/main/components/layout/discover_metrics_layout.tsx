/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { MetricsGridSection } from '@kbn/unified-metrics-grid';
// import { OutPortal } from 'react-reverse-portal';
// import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { type DiscoverMainContentProps } from './discover_main_content';
// import { useCurrentChartPortalNode } from '../../state_management/redux';

export const DiscoverMetricsLayout = ({
  panelsToggle,
}: // ...mainContentProps
DiscoverMainContentProps) => {
  const fields = [
    {
      name: 'cpu.usage',
      index: 'metrics-*',
      dimensions: [{ name: 'host.name', type: 'string' }],
      type: 'float',
      time_series_metric: 'avg',
      unit: '%',
    },
    {
      name: 'memory.usage',
      index: 'metrics-*',
      dimensions: [{ name: 'host.name', type: 'string' }],
      type: 'float',
      time_series_metric: 'avg',
      unit: 'MB',
    },
    {
      name: 'disk.io',
      index: 'metrics-*',
      dimensions: [{ name: 'host.name', type: 'string' }],
      type: 'float',
      time_series_metric: 'avg',
      unit: 'IOPS',
    },
    {
      name: 'network.traffic',
      index: 'metrics-*',
      dimensions: [{ name: 'host.name', type: 'string' }],
      type: 'float',
      time_series_metric: 'avg',
      unit: 'KB/s',
    }
  ];

  // TODO: Replace with actual timeRange values when available
  const timeRange = { from: 'now-1h', to: 'now' };

  return (
    // <MetricsGridSection
    //   props here
    // >
    //   <DiscoverMainContent {...mainContentProps} panelsToggle={panelsToggle} />
    // </MetricsGridSection>

    <MetricsGridSection indexPattern="metrics-*" timeRange={timeRange} fields={fields} />
  );
};
