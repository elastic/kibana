/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { createMetricsExperienceClient } from './api';
import type { MetricsExperiencePluginClass } from './types';
import { METRICS_EXPERIENCE_FEATURE_FLAG_KEY } from '../common/constants';

export class MetricsExperiencePlugin implements MetricsExperiencePluginClass {
  public setup(core: CoreSetup) {
    return {};
  }

  public start(_core: CoreStart) {
    const isEnabled = _core.featureFlags.getBooleanValue(METRICS_EXPERIENCE_FEATURE_FLAG_KEY, true);

    return {
      metricsExperienceClient: isEnabled ? createMetricsExperienceClient(_core) : undefined,
    };
  }

  public stop() {}
}
