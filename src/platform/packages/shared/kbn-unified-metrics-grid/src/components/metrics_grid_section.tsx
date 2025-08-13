/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { MetricsGrid } from './metrics_grid';
import { MetricField } from '../types';

export const MetricsGridSection: React.FC<{
  indexPattern: string;
  timeRange: { from?: string; to?: string };
  fields: MetricField[];
  // TODO add props
}> = ({ fields, timeRange }) => {
  // Hardcoded demo data
  const loading = false;
  const searchTerm = '';
  const dimensions: string[] = [];
  const filters: Array<{ field: string; value: string }> = [];
  const displayDensity = 'normal';

  return (
    <MetricsGrid
      fields={fields}
      timeRange={timeRange}
      loading={loading}
      searchTerm={searchTerm}
      filters={filters}
      dimensions={dimensions}
      pivotOn="metric"
      displayDensity={displayDensity}
    />
  );
};
