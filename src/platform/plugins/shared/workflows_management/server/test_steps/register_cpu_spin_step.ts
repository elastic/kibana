/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import type { CoreSetup } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { cpuSpinStepDefinition } from './cpu_spin_step';

const EVENT_LOOP_WATCHDOG_FEATURE_FLAG = 'core.eventLoopWatchdog.enabled';

/** Registers the CPU-spin step only while the event-loop-watchdog PoC is enabled. */
export const registerTestOnlyCpuSpinStep = (
  core: CoreSetup,
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(async () => {
    const [coreStart] = await core.getStartServices();
    const enabled = await firstValueFrom(
      coreStart.featureFlags.getBooleanValue$(EVENT_LOOP_WATCHDOG_FEATURE_FLAG, false)
    );

    return enabled ? cpuSpinStepDefinition : undefined;
  });
};
