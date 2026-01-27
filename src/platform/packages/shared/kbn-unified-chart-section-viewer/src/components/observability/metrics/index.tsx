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
import type { UnifiedMetricsGridProps } from '../../../types';
import { MetricsExperienceFieldsCapsProvider } from './context/metrics_experience_fields_provider';

const InternalUnifiedMetricsExperienceGrid = (props: UnifiedMetricsGridProps) => {
  return (
    <PerformanceContextProvider>
      <MetricsExperienceFieldsCapsProvider fetchParams={props.fetchParams}>
        <MetricsExperienceGrid {...props} />
      </MetricsExperienceFieldsCapsProvider>
    </PerformanceContextProvider>
  );
};

const InternalUnifiedMetricsExperienceGridWithState = (props: UnifiedMetricsGridProps) => {
  return (
    <MetricsExperienceStateProvider>
      <InternalUnifiedMetricsExperienceGrid {...props} />
    </MetricsExperienceStateProvider>
  );
};

const UnifiedMetricsExperienceGridWithRestorableState = withRestorableState(
  InternalUnifiedMetricsExperienceGridWithState
);

// eslint-disable-next-line import/no-default-export
export default UnifiedMetricsExperienceGridWithRestorableState;
