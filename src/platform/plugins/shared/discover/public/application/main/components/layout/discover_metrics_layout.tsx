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
import type { MetricField } from '@kbn/unified-metrics-grid/src/types';

interface DiscoverMetricsLayoutProps {
  indexPattern: string;
  fields: MetricField[];
  timeRange: { from: string; to: string };
  headerActions?: {
    hasExploreAction?: boolean;
    hasMetricsInsightsAction?: boolean;
  };
}

export const DiscoverMetricsLayout = ({
  fields,
  timeRange,
  indexPattern = 'metrics-*',
  headerActions,
}: DiscoverMetricsLayoutProps) => {
  return (
    <MetricsGridSection
      indexPattern={indexPattern}
      timeRange={timeRange}
      fields={fields}
      headerActions={headerActions}
    />
  );
};
