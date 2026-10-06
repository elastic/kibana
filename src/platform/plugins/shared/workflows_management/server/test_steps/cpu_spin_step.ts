/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { cpuSpinStepCommonDefinition } from '../../common/test_steps/cpu_spin_step';

export { MAX_CPU_SPIN_DURATION_MS } from '../../common/test_steps/cpu_spin_step';

export const cpuSpinStepDefinition = createServerStepDefinition({
  ...cpuSpinStepCommonDefinition,
  handler: async ({ input }) => {
    const startedAt = performance.now();
    const deadline = startedAt + input.durationMs;
    let iterations = 0;

    while (performance.now() < deadline) {
      iterations += 1;
    }

    return {
      output: {
        blockedMs: Math.round(performance.now() - startedAt),
        iterations,
      },
    };
  },
});
