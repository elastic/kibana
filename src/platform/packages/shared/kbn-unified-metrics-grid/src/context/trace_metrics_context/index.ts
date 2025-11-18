/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import { createContext, useContext } from 'react';
import type { Observable } from 'rxjs';
import type { DataSource } from '../../components/trace_metrics_grid';

type TraceMetricsContextProps = {
  dataSource: DataSource;
  indexes: string;
  filters: string[];
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
} & Pick<
  ChartSectionProps,
  'services' | 'searchSessionId' | 'abortController' | 'onBrushEnd' | 'onFilter' | 'timeRange'
>;

export const TraceMetricsContext = createContext<TraceMetricsContextProps | undefined>(undefined);

export const TraceMetricsProvider = TraceMetricsContext.Provider;

export const useTraceMetricsContext = () => {
  const context = useContext(TraceMetricsContext);
  if (!context) {
    throw new Error('useTraceMetrics must be used within a TraceMetricsProvider');
  }
  return context;
};
