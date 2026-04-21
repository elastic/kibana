/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { WORKFLOWS_CONCURRENCY_SEMAPHORE_INDEX } from '../../common';

/**
 * Provides atomic concurrency slot management using a single ES document per
 * concurrency group as a distributed semaphore.
 *
 * Each semaphore document stores an `activeSlots` array of execution IDs that
 * currently hold a slot. Slot acquisition and release are performed via painless
 * scripted updates with `retry_on_conflict`, guaranteeing atomicity even under
 * heavy concurrent access from multiple Kibana nodes.
 *
 * This eliminates the TOCTOU race present in search-based concurrency checks,
 * where ES near-real-time refresh lag allows more executions through than the
 * configured `max`.
 */
export class ConcurrencySemaphoreRepository {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Atomically tries to acquire a concurrency slot for the given execution.
   *
   * The painless script checks `activeSlots.size() < max` and appends the
   * execution ID in a single versioned document update. Concurrent callers
   * that hit a version conflict are retried automatically.
   *
   * @returns `true` if the slot was acquired, `false` if all slots are occupied.
   */
  public async tryAcquireSlot(
    concurrencyGroupKey: string,
    spaceId: string,
    executionId: string,
    max: number
  ): Promise<boolean> {
    const docId = buildSemaphoreDocId(concurrencyGroupKey, spaceId);

    const response = await this.esClient.update({
      index: WORKFLOWS_CONCURRENCY_SEMAPHORE_INDEX,
      id: docId,
      retry_on_conflict: 50,
      scripted_upsert: true,
      script: {
        lang: 'painless',
        source: ACQUIRE_SLOT_SCRIPT,
        params: { max, executionId },
      },
      upsert: {
        concurrencyGroupKey,
        spaceId,
        activeSlots: [],
      },
    });

    // 'noop' is only set when all slots are occupied (see ACQUIRE_SLOT_SCRIPT).
    // Both 'created' (first upsert) and 'updated' (slot acquired or already held) mean success.
    return response.result !== 'noop';
  }

  /**
   * Atomically releases a concurrency slot held by the given execution.
   *
   * Safe to call multiple times for the same execution (idempotent).
   * Errors are intentionally swallowed — reconciliation corrects any drift.
   */
  public async releaseSlot(
    concurrencyGroupKey: string,
    spaceId: string,
    executionId: string
  ): Promise<void> {
    const docId = buildSemaphoreDocId(concurrencyGroupKey, spaceId);

    await this.esClient
      .update({
        index: WORKFLOWS_CONCURRENCY_SEMAPHORE_INDEX,
        id: docId,
        retry_on_conflict: 50,
        script: {
          lang: 'painless',
          source: RELEASE_SLOT_SCRIPT,
          params: { executionId },
        },
      })
      .catch(() => {
        // Best effort — reconciliation will correct any drift
      });
  }

  /**
   * Overwrites the semaphore's `activeSlots` to contain only the IDs that are
   * genuinely active. Called during crash recovery to clear stale slots left by
   * executions that terminated without releasing (e.g. Kibana restart).
   */
  public async reconcileSlots(
    concurrencyGroupKey: string,
    spaceId: string,
    actualActiveIds: string[]
  ): Promise<void> {
    const docId = buildSemaphoreDocId(concurrencyGroupKey, spaceId);

    await this.esClient
      .update({
        index: WORKFLOWS_CONCURRENCY_SEMAPHORE_INDEX,
        id: docId,
        retry_on_conflict: 5,
        script: {
          lang: 'painless',
          source: RECONCILE_SLOTS_SCRIPT,
          params: { activeIds: actualActiveIds },
        },
      })
      .catch(() => {
        // Best effort
      });
  }
}

function buildSemaphoreDocId(concurrencyGroupKey: string, spaceId: string): string {
  return `${spaceId}:${concurrencyGroupKey}`;
}

// -- Painless scripts (kept as constants to avoid repeated string construction) -

const ACQUIRE_SLOT_SCRIPT = `
  if (ctx._source.activeSlots == null) {
    ctx._source.activeSlots = new ArrayList();
  }
  if (ctx._source.activeSlots.contains(params.executionId)) {
    return;
  }
  if (ctx._source.activeSlots.size() < params.max) {
    ctx._source.activeSlots.add(params.executionId);
  } else {
    ctx.op = 'noop';
  }
`.trim();

const RELEASE_SLOT_SCRIPT = `
  if (ctx._source.activeSlots != null) {
    ctx._source.activeSlots.removeIf(s -> s.equals(params.executionId));
  }
`.trim();

const RECONCILE_SLOTS_SCRIPT = `
  if (ctx._source.activeSlots != null) {
    ctx._source.activeSlots.retainAll(params.activeIds);
  }
`.trim();
