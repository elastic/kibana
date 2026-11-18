/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod/v4';
import { createServerStepRegistry } from './create_server_step_registry';
import type { WorkflowStepsContribution } from './create_server_step_registry';

describe('createServerStepRegistry', () => {
  const logger = loggerMock.create();

  it('has the internal data.* steps and the internal triggers without a plugin lifecycle', async () => {
    const registry = createServerStepRegistry(logger);
    await registry.isReady();
    expect(registry.hasStepDefinition('data.map')).toBe(true);
    expect(registry.getStepDefinition('data.map')?.id).toBe('data.map');
    expect(registry.hasStepDefinition('unknown.step')).toBe(false);
    expect(registry.getAllStepDefinitions().length).toBeGreaterThanOrEqual(10);
    expect(registry.getAllTriggerDefinitions().length).toBeGreaterThan(0);
  });

  it('takes the steps and triggers a contribution registers, loaders included, before isReady resolves', async () => {
    const registry = createServerStepRegistry(logger);
    const contribution: WorkflowStepsContribution = {
      register: async (steps) => {
        steps.registerStepDefinition({
          id: 'fake.eager',
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ output: {} }),
        } as never);
        steps.registerStepDefinition((async () => ({
          id: 'fake.lazy',
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ output: {} }),
        })) as never);
        steps.registerTriggerDefinition({
          id: 'fake.trigger',
          eventSchema: z.object({ a: z.string() }),
        } as never);
      },
    };
    await contribution.register(registry, {
      host: {},
      logger,
      isServerless: false,
      kibanaVersion: '1.0.0',
      settings: {},
    });
    await registry.isReady();

    expect(registry.hasStepDefinition('fake.eager')).toBe(true);
    expect(registry.hasStepDefinition('fake.lazy')).toBe(true);
    expect(registry.getTriggerDefinition('fake.trigger')?.id).toBe('fake.trigger');
  });

  it('rejects a duplicate registration as the plugin does', () => {
    const registry = createServerStepRegistry(logger);
    expect(() =>
      registry.registerStepDefinition({
        id: 'data.map',
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ output: {} }),
      } as never)
    ).toThrow(/already registered/);
  });
});
