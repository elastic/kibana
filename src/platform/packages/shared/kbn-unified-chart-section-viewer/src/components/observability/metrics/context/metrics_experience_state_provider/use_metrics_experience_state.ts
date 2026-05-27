/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext } from 'react';

import { MetricsExperienceStateContext } from './metrics_experience_state_context';

export const useMetricsExperienceState = () => {
  const context = useContext(MetricsExperienceStateContext);

  if (!context) {
    throw new Error(
      'useMetricsExperienceState must be used within a MetricsExperienceStateProvider'
    );
  }

  return context;
};
