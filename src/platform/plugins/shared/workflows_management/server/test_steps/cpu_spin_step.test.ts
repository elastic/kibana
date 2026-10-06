/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { cpuSpinStepDefinition, MAX_CPU_SPIN_DURATION_MS } from './cpu_spin_step';
import { registerTestOnlyCpuSpinStep } from './register_cpu_spin_step';

describe('cpuSpinStepDefinition', () => {
  it('blocks the execution thread for the requested duration', async () => {
    let timerRan = false;
    const timer = setTimeout(() => {
      timerRan = true;
    }, 0);

    const result = await cpuSpinStepDefinition.handler({ input: { durationMs: 20 } } as never);

    expect(timerRan).toBe(false);
    expect(result).toEqual({
      output: expect.objectContaining({
        blockedMs: expect.any(Number),
        iterations: expect.any(Number),
      }),
    });
    expect(result.output?.blockedMs).toBeGreaterThanOrEqual(20);
    expect(result.output?.iterations).toBeGreaterThan(0);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(timerRan).toBe(true);
    clearTimeout(timer);
  });

  it.each([0, MAX_CPU_SPIN_DURATION_MS + 1, 1.5])('rejects invalid duration %s', (durationMs) => {
    expect(cpuSpinStepDefinition.inputSchema.safeParse({ durationMs }).success).toBe(false);
  });
});

describe('registerTestOnlyCpuSpinStep', () => {
  const setup = async (enabled: boolean) => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}] as never);
    coreStart.featureFlags.getBooleanValue$.mockReturnValue(of(enabled));

    registerTestOnlyCpuSpinStep(coreSetup, workflowsExtensions);

    const [stepDefinitionOrLoader] = workflowsExtensions.registerStepDefinition.mock.calls[0];
    if (typeof stepDefinitionOrLoader !== 'function') {
      throw new Error('Expected a step-definition loader');
    }
    return stepDefinitionOrLoader();
  };

  it('registers the step when the watchdog PoC is enabled', async () => {
    await expect(setup(true)).resolves.toBe(cpuSpinStepDefinition);
  });

  it('does not register the step when the watchdog PoC is disabled', async () => {
    await expect(setup(false)).resolves.toBeUndefined();
  });
});
