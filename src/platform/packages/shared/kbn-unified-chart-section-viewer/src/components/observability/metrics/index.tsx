/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import { withRestorableState } from '../../../restorable_state';
import { MetricsExperienceStateProvider } from './context/metrics_experience_state_provider';
import { EventBasedTelemetryProvider } from '../../../context/ebt_telemetry_context';
import { ChartSectionInspectorProvider } from '../../../context/chart_section_inspector';
import type { UnifiedMetricsGridProps } from '../../../types';

const InternalUnifiedMetricsExperienceGrid = (props: UnifiedMetricsGridProps) => {
  return (
    <PerformanceContextProvider>
      <EventBasedTelemetryProvider analytics={props.services.analytics}>
        <ChartSectionInspectorProvider setLensRequestAdapter={props.setLensRequestAdapter}>
          <MetricsExperienceGrid {...props} />
        </ChartSectionInspectorProvider>
      </EventBasedTelemetryProvider>
    </PerformanceContextProvider>
  );
};

const InternalUnifiedMetricsExperienceGridWithState = (props: UnifiedMetricsGridProps) => {
  return (
    <MetricsExperienceStateProvider profileId={props.profileId}>
      <InternalUnifiedMetricsExperienceGrid {...props} />
    </MetricsExperienceStateProvider>
  );
};

const UnifiedMetricsExperienceGridWithRestorableState = withRestorableState(
  InternalUnifiedMetricsExperienceGridWithState
);

// eslint-disable-next-line import/no-default-export
export default UnifiedMetricsExperienceGridWithRestorableState;
