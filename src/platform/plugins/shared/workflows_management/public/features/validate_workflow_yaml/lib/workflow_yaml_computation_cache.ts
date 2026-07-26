/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComputedData } from '../../../entities/workflows/store/workflow_detail/types';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

const MAX_CACHE_ENTRIES = 32;
const IDLE_COMPUTATION_TIMEOUT_MS = 500;

/** Shared async YAML computation cache used by change-history preview validation. */
const computationCache = new Map<string, ComputedData>();

const touchCacheEntry = (yamlString: string, computed: ComputedData): void => {
  computationCache.delete(yamlString);
  computationCache.set(yamlString, computed);
};

const setCacheEntry = (yamlString: string, computed: ComputedData): void => {
  touchCacheEntry(yamlString, computed);

  if (computationCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = computationCache.keys().next().value;
    if (oldestKey !== undefined) {
      computationCache.delete(oldestKey);
    }
  }
};

const scheduleIdle = (run: () => void): (() => void) => {
  if (typeof requestIdleCallback === 'function') {
    const idleId = requestIdleCallback(run, { timeout: IDLE_COMPUTATION_TIMEOUT_MS });
    return () => cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(run, 0);
  return () => window.clearTimeout(timeoutId);
};

const yieldToMainThread = (): Promise<void> => {
  const { scheduler } = globalThis as typeof globalThis & {
    scheduler?: { yield?: () => Promise<void> };
  };

  if (scheduler && typeof scheduler.yield === 'function') {
    return scheduler.yield();
  }

  return new Promise((resolve) => {
    scheduleIdle(() => resolve());
  });
};

/** Defers computation until after paint (rAF) and an idle slice to avoid blocking editor mount. */
const runComputationOffMainTick = (
  run: () => void | Promise<void>,
  signal?: AbortSignal
): (() => void) => {
  if (signal?.aborted) {
    return () => undefined;
  }

  let rafId: number | undefined;
  let cancelIdle: (() => void) | undefined;

  const cancel = (): void => {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
    }
    cancelIdle?.();
  };

  rafId = requestAnimationFrame(() => {
    rafId = undefined;
    if (signal?.aborted) {
      return;
    }

    cancelIdle = scheduleIdle(() => {
      void run();
    });
  });

  signal?.addEventListener('abort', cancel, { once: true });
  return cancel;
};

const computeAndCacheYaml = async (
  yamlString: string,
  signal?: AbortSignal
): Promise<ComputedData> => {
  await yieldToMainThread();

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const computed = performComputation(yamlString);
  setCacheEntry(yamlString, computed);
  return computed;
};

export const getCachedWorkflowYamlComputationAsync = (
  yamlString: string,
  signal?: AbortSignal
): Promise<ComputedData> => {
  const cached = computationCache.get(yamlString);
  if (cached) {
    touchCacheEntry(yamlString, cached);
    return Promise.resolve(cached);
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise((resolve, reject) => {
    const cancelScheduledRun = runComputationOffMainTick(async () => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      try {
        resolve(await computeAndCacheYaml(yamlString, signal));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }, signal);

    signal?.addEventListener(
      'abort',
      () => {
        cancelScheduledRun();
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
};

export const clearWorkflowYamlComputationCache = (): void => {
  computationCache.clear();
};

/**
 * Synchronously seeds the preview computation cache.
 *
 * @internal For unit tests only — production code must use
 * `getCachedWorkflowYamlComputationAsync`.
 */
export const populateWorkflowYamlComputationCacheEntryForTests = (
  yamlString: string
): ComputedData => {
  const computed = performComputation(yamlString);
  setCacheEntry(yamlString, computed);
  return computed;
};
