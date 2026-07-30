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
import { ExternalServicesProvider } from '../../../context/external_services';
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
    // The state provider reads feature flags from the external services
    // context, so it must be mounted below ExternalServicesProvider.
    <ExternalServicesProvider externalServices={props.externalServices}>
      <MetricsExperienceStateProvider
        profileId={props.profileId}
        gridSettings={props.gridSettings}
        onGridSettingsChange={props.onGridSettingsChange}
        metricsSort={props.metricsSort}
        onMetricsSortChange={props.onMetricsSortChange}
        getRecentlyExploredMetrics={props.getRecentlyExploredMetrics}
        discoverFetch$={props.fetch$}
        onMetricExplored={props.onMetricExplored}
      >
        <InternalUnifiedMetricsExperienceGrid {...props} />
      </MetricsExperienceStateProvider>
    </ExternalServicesProvider>
  );
};

const UnifiedMetricsExperienceGridWithRestorableState = withRestorableState(
  InternalUnifiedMetricsExperienceGridWithState
);

// eslint-disable-next-line import/no-default-export
export default UnifiedMetricsExperienceGridWithRestorableState;
