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
import { OutPortal } from 'react-reverse-portal';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useCurrentChartPortalNode } from '../../state_management/redux';

export const DiscoverMetricsLayout = ({
  panelsToggle,
  ...mainContentProps
}: DiscoverMainContentProps) => {
  const chartPortalNode = useCurrentChartPortalNode();

  return (
    <MetricsGridSection
      unifiedHistogramChart={
        chartPortalNode ? <OutPortal node={chartPortalNode} panelsToggle={panelsToggle} /> : null
      }
      // TODO: Uncomment and pass the required props when data fetching is available
      // indexPattern="metrics-*"
      // timeRange={timeRange}
      // fields={fields}
      // loading={loading}
      // searchTerm={searchTerm}
      // filters={filters}
      // dimensions={dimensions}
      // displayDensity={displayDensity}
      // pivotOn="metric"
    >
      <DiscoverMainContent {...mainContentProps} panelsToggle={panelsToggle} />
    </MetricsGridSection>
  );
};
