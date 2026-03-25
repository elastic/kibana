/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createUnifiedChartSectionViewerTelemetry,
  type UnifiedChartSectionViewerTelemetry,
} from '../analytics/report_unified_chart_section_viewer_data_summary';

const EventBasedTelemetryContext = createContext<UnifiedChartSectionViewerTelemetry | null>(null);

export interface EventBasedTelemetryProviderProps {
  analytics?: AnalyticsServiceStart;
  children: ReactNode;
}

export const EventBasedTelemetryProvider = ({
  analytics,
  children,
}: EventBasedTelemetryProviderProps) => {
  const value = useMemo(() => createUnifiedChartSectionViewerTelemetry(analytics), [analytics]);

  return (
    <EventBasedTelemetryContext.Provider value={value}>
      {children}
    </EventBasedTelemetryContext.Provider>
  );
};

export const useTelemetry = (): UnifiedChartSectionViewerTelemetry => {
  const ctx = useContext(EventBasedTelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used within an EventBasedTelemetryProvider');
  }
  return ctx;
};
