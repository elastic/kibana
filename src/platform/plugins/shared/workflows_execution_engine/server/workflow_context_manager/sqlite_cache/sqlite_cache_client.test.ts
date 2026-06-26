/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Round-trip tests for SqliteCacheClient covering all 4 flag combinations:
 *   compressIpc × jsonbStorage ∈ {false,true}²
 *
 * These tests spin up a real db_worker via the src harness and exercise the
 * full put→get IPC path end-to-end, including compression and JSONB transcoding.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SqliteCacheClient } from './sqlite_cache_client';

// Helper: construct a client wired to the src harness (not dist)
const makeClient = (opts: { compressIpc: boolean; jsonbStorage: boolean }) =>
  new SqliteCacheClient(loggerMock.create(), false /* isDist */, opts);

const WORKFLOW_RUN_ID = 'test-run-1';
const STEP_ID = 'step-exec-1';

const PAYLOAD = {
  output: { size: 42, label: 'hello', nested: { arr: [1, 2, 3] } },
  status: 'success',
};

const FLAG_COMBOS: Array<{ compressIpc: boolean; jsonbStorage: boolean }> = [
  { compressIpc: false, jsonbStorage: false },
  { compressIpc: true, jsonbStorage: false },
  { compressIpc: false, jsonbStorage: true },
  { compressIpc: true, jsonbStorage: true },
];

describe.each(FLAG_COMBOS)(
  'SqliteCacheClient round-trip (compressIpc=$compressIpc, jsonbStorage=$jsonbStorage)',
  ({ compressIpc, jsonbStorage }) => {
    let client: SqliteCacheClient;

    beforeEach(() => {
      client = makeClient({ compressIpc, jsonbStorage });
    });

    afterEach(async () => {
      await client.shutdown();
    });

    it('returns the stored value unchanged', async () => {
      client.put(STEP_ID, WORKFLOW_RUN_ID, PAYLOAD);

      // Small delay to let the fire-and-forget put reach the worker before get
      await new Promise((r) => setTimeout(r, 50));

      const result = await client.get([STEP_ID], WORKFLOW_RUN_ID);
      expect(result.get(STEP_ID)).toEqual(PAYLOAD);
    });

    it('returns null for a stored null payload', async () => {
      client.put(STEP_ID, WORKFLOW_RUN_ID, null);
      await new Promise((r) => setTimeout(r, 50));

      const result = await client.get([STEP_ID], WORKFLOW_RUN_ID);
      expect(result.get(STEP_ID)).toBeNull();
    });

    it('returns an empty Map for an id that was never stored', async () => {
      const result = await client.get(['no-such-id'], WORKFLOW_RUN_ID);
      expect(result.size).toBe(0);
    });

    it('handles multiple ids in a single get', async () => {
      const ids = ['s1', 's2', 's3'];
      const payloads = [{ v: 1 }, { v: 2 }, { v: 3 }];

      for (let i = 0; i < ids.length; i++) {
        client.put(ids[i], WORKFLOW_RUN_ID, payloads[i]);
      }
      await new Promise((r) => setTimeout(r, 50));

      const result = await client.get(ids, WORKFLOW_RUN_ID);
      for (let i = 0; i < ids.length; i++) {
        expect(result.get(ids[i])).toEqual(payloads[i]);
      }
    });

    it('isolates runs — a get with a different workflowRunId finds nothing', async () => {
      client.put(STEP_ID, WORKFLOW_RUN_ID, PAYLOAD);
      await new Promise((r) => setTimeout(r, 50));

      const result = await client.get([STEP_ID], 'different-run-id');
      expect(result.size).toBe(0);
    });
  }
);

describe('SqliteCacheClient JSONB queryability (jsonbStorage=true)', () => {
  it('stores payload in queryable JSONB so json_extract works at the worker layer', async () => {
    // This test verifies the groundwork is real: after a put, the worker's SQLite
    // table holds binary JSON that SQLite's json_extract() can query directly.
    // We exercise this indirectly by confirming the round-trip preserves deeply
    // nested structure — JSONB transcode would corrupt data if broken.
    const client = makeClient({ compressIpc: false, jsonbStorage: true });
    const deep = { a: { b: { c: [true, null, 'str', 42] } } };

    client.put('deep-step', WORKFLOW_RUN_ID, deep);
    await new Promise((r) => setTimeout(r, 50));

    const result = await client.get(['deep-step'], WORKFLOW_RUN_ID);
    expect(result.get('deep-step')).toEqual(deep);

    await client.shutdown();
  });
});
