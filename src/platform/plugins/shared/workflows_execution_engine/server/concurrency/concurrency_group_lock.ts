/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { isLockAcquisitionError } from '@kbn/lock-manager';

/**
 * One holder at a time for a concurrency group.
 * `@kbn/lock-manager` releases when the callback returns, so this stays a mutex:
 * execution documents remain the slot and queue source of truth, and admission
 * plus queue promotion share the mutex instead of a second slot index.
 */
export interface ConcurrencyGroupLock {
  withLock<T>(
    lockId: string,
    callback: () => Promise<T>,
    options?: { metadata?: Record<string, unknown> }
  ): Promise<T>;
}

const CONCURRENCY_GROUP_LOCK_WAIT_MS = 90_000;
const LOCK_RETRY_INITIAL_MS = 25;
const LOCK_RETRY_MAX_MS = 200;

const heldGroupLocks = new AsyncLocalStorage<Set<string>>();
let activeLock: ConcurrencyGroupLock | undefined;

/** Installed from plugin start so drain and task entry points share admission's mutex. */
export const setConcurrencyGroupLock = (lock: ConcurrencyGroupLock | undefined): void => {
  activeLock = lock;
};

export const getConcurrencyGroupLock = (): ConcurrencyGroupLock | undefined => activeLock;

/** Stable Elasticsearch id. The raw group key is user data and may not be a legal document id. */
export const concurrencyGroupLockId = (spaceId: string, concurrencyGroupKey: string): string => {
  const digest = createHash('sha256').update(`${spaceId}\0${concurrencyGroupKey}`).digest('hex');
  return `workflow-concurrency:${digest}`;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` while this Kibana node holds the group's distributed lock.
 * A nested call for the same group in this async context runs directly, so queue
 * promotion inside admission does not wait on a lock it already holds.
 * Callers that lose the race retry until the holder releases it.
 */
export const withConcurrencyGroupLock = async <T>(
  lock: ConcurrencyGroupLock | undefined,
  spaceId: string,
  concurrencyGroupKey: string | null | undefined,
  fn: () => Promise<T>
): Promise<T> => {
  if (!lock || !concurrencyGroupKey) {
    return fn();
  }

  const lockId = concurrencyGroupLockId(spaceId, concurrencyGroupKey);
  const held = heldGroupLocks.getStore();
  if (held?.has(lockId)) {
    return fn();
  }

  const deadline = Date.now() + CONCURRENCY_GROUP_LOCK_WAIT_MS;
  let failedAttempt = 0;
  while (true) {
    try {
      return await lock.withLock(
        lockId,
        () => {
          const next = new Set(held);
          next.add(lockId);
          return heldGroupLocks.run(next, fn);
        },
        { metadata: { purpose: 'workflow-concurrency-admission', spaceId } }
      );
    } catch (error) {
      if (!isLockAcquisitionError(error) || Date.now() >= deadline) {
        throw error;
      }
      failedAttempt += 1;
      await delay(Math.min(LOCK_RETRY_INITIAL_MS * 2 ** (failedAttempt - 1), LOCK_RETRY_MAX_MS));
    }
  }
};
