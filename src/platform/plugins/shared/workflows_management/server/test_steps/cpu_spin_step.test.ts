/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
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
  const load = async (enabled: boolean) => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const workflowsExtensions = workflowsExtensionsMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}] as never);
    const flag$ = new BehaviorSubject(enabled);
    coreStart.featureFlags.getBooleanValue$.mockReturnValue(flag$);

    registerTestOnlyCpuSpinStep(coreSetup, workflowsExtensions);

    const [stepDefinitionOrLoader] = workflowsExtensions.registerStepDefinition.mock.calls[0];
    if (typeof stepDefinitionOrLoader !== 'function') {
      throw new Error('Expected a step-definition loader');
    }
    const definition = await stepDefinitionOrLoader();
    if (!definition || !('handler' in definition)) {
      throw new Error('Expected the step to be registered with a handler');
    }
    return { definition, flag$ };
  };

  it('always registers the step, so that the flag can be toggled at runtime', async () => {
    const { definition } = await load(false);
    expect(definition.id).toBe(cpuSpinStepDefinition.id);
  });

  it('spins only while the watchdog PoC flag is on', async () => {
    const { definition, flag$ } = await load(true);
    await expect(definition.handler({ input: { durationMs: 5 } } as never)).resolves.toMatchObject({
      output: { blockedMs: expect.any(Number) },
    });
    flag$.next(false);
    await expect(definition.handler({ input: { durationMs: 5 } } as never)).rejects.toThrow(
      'test.cpuSpin requires the core.eventLoopWatchdog.enabled feature flag'
    );
  });
});
