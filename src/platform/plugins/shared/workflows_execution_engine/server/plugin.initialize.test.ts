/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';

import { createCircuitBreakerError } from './__fixtures__/circuit_breaker_error';

const mockCreateIndexes = jest.fn();
jest.mock('../common', () => ({
  createIndexes: (...args: unknown[]) => mockCreateIndexes(...args),
}));

import { WorkflowsExecutionEnginePlugin } from './plugin';

/**
 * The plugin lazily creates execution + step indices on the first contract
 * call via a memoized promise:
 *
 *   if (!this.initializePromise) {
 *     this.initializePromise = createIndexes({ ... });
 *   }
 *   await this.initializePromise;
 *
 * Without clearing the cached promise on rejection, a single transient
 * `circuit_breaking_exception` from `createIndexes` poisons the plugin: every
 * subsequent invocation re-awaits the *same* rejected promise and short-circuits
 * with the same error. That turns a recoverable cluster blip into a permanent
 * plugin-level outage that only a Kibana restart fixes.
 *
 * This test exercises `initialize` directly via a typed test-only accessor
 * rather than booting all the contract methods that depend on it. That keeps
 * the test focused on the rejection-cache contract.
 */

interface InitializeAccessor {
  initialize(coreStart: CoreStart): Promise<void>;
}

const accessInitialize = (plugin: WorkflowsExecutionEnginePlugin): InitializeAccessor =>
  plugin as unknown as InitializeAccessor;

const createPlugin = (): WorkflowsExecutionEnginePlugin => {
  const initializerContext = coreMock.createPluginInitializerContext({
    logging: { console: false },
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
  });
  return new WorkflowsExecutionEnginePlugin(initializerContext);
};

describe('WorkflowsExecutionEnginePlugin.initialize — rejection caching', () => {
  beforeEach(() => {
    mockCreateIndexes.mockReset();
  });

  it('does not cache a rejected createIndexes promise — a subsequent call retries', async () => {
    mockCreateIndexes
      .mockRejectedValueOnce(createCircuitBreakerError())
      .mockResolvedValueOnce(undefined);

    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    await expect(accessInitialize(plugin).initialize(coreStart)).rejects.toMatchObject({
      statusCode: 429,
      body: { error: { type: 'circuit_breaking_exception' } },
    });

    await expect(accessInitialize(plugin).initialize(coreStart)).resolves.toBeUndefined();

    expect(mockCreateIndexes).toHaveBeenCalledTimes(2);
  });

  it('still memoizes a successful initialization (createIndexes runs exactly once across many calls)', async () => {
    mockCreateIndexes.mockResolvedValue(undefined);

    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    await accessInitialize(plugin).initialize(coreStart);
    await accessInitialize(plugin).initialize(coreStart);
    await accessInitialize(plugin).initialize(coreStart);

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent in-flight calls to a single createIndexes invocation', async () => {
    let resolveCreate!: () => void;
    mockCreateIndexes.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        })
    );

    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    const first = accessInitialize(plugin).initialize(coreStart);
    const second = accessInitialize(plugin).initialize(coreStart);

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);

    resolveCreate();
    await Promise.all([first, second]);

    expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
  });
});
