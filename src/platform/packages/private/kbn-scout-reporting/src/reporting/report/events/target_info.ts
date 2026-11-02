/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestTarget, targetAttributes } from '@kbn/scout-info';
import type { ScoutTestRunInfo } from './event';

/**
 * Describe the test target of the current process for a Scout test event.
 *
 * Shared by every reporter that writes into the Scout test events index so they cannot
 * disagree about what a run's target was — in particular, so none of them silently omits the
 * target attributes and makes a run under FIPS look like an ordinary one.
 *
 * @param defaultLocation Location to report when the environment declares no test target
 */
export const buildScoutTargetInfo = (
  defaultLocation: string = 'local'
): ScoutTestRunInfo['target'] => {
  const testTarget = ScoutTestTarget.tryFromEnv();

  return {
    type: testTarget?.location || defaultLocation,
    mode: testTarget?.tagWithoutLocation || 'unknown',
    attributes: targetAttributes.current(),
  };
};
