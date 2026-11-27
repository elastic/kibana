/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createTestServers,
  createRootWithCorePlugins,
  getSupertest,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';

const GENESIS_GATE_ID = 'genesis-gate';
const NEW_GATE_ID = 'new-gate';

/**
 * Boots a Kibana `Root` simulating a single Serverless build, exercises the debug route for
 * the given gate ids, then shuts it down. `buildNum` and `gates` are threaded through
 * `rolloutGates.dev.*` config overrides (see `server/config.ts`) because test builds are never
 * distributables, so the plugin would otherwise always be a no-op.
 */
async function bootAndGetPhases(buildNum: number, gateIds: string[]) {
  const root = createRootWithCorePlugins(
    {
      rolloutGates: {
        dev: {
          buildNum,
          gates: gateIds,
        },
      },
    },
    { serverless: true }
  );

  await root.preboot();
  await root.setup();
  await root.start();

  try {
    const phases: Record<string, string> = {};
    for (const gateId of gateIds) {
      const { body } = await getSupertest(root, 'get', `/internal/rollout_gates/${gateId}`)
        .set('x-elastic-internal-origin', 'kibana')
        .expect(200);
      phases[gateId] = body.phase;
    }
    return phases;
  } finally {
    await root.shutdown();
  }
}

describe('rollout gates - simulated Serverless build sequence', () => {
  let esServer: TestElasticsearchUtils;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
  }, 120_000);

  afterAll(async () => {
    await esServer?.stop();
  });

  it('tracks staged vs finalized across builds 100 -> 101 -> 102 -> 101 (rollback)', async () => {
    // Build 100: only the "genesis" gate exists. It is introduced on the very first build the
    // ledger has ever seen, so it must read as finalized immediately.
    const build100 = await bootAndGetPhases(100, [GENESIS_GATE_ID]);
    expect(build100[GENESIS_GATE_ID]).toBe('finalized');

    // Build 101: a new gate is introduced for the first time. It ships on this build only, so
    // it's still in its interim/staged phase (no earlier build has it).
    const build101 = await bootAndGetPhases(101, [GENESIS_GATE_ID, NEW_GATE_ID]);
    expect(build101[GENESIS_GATE_ID]).toBe('finalized');
    expect(build101[NEW_GATE_ID]).toBe('staged');

    // Build 102: a later build than the one that introduced the new gate, so it's now finalized.
    const build102 = await bootAndGetPhases(102, [GENESIS_GATE_ID, NEW_GATE_ID]);
    expect(build102[GENESIS_GATE_ID]).toBe('finalized');
    expect(build102[NEW_GATE_ID]).toBe('finalized');

    // Rollback to build 101: the new gate is staged again, since the running build is no longer
    // newer than the build that introduced it (rollback-safety).
    const rollback101 = await bootAndGetPhases(101, [GENESIS_GATE_ID, NEW_GATE_ID]);
    expect(rollback101[GENESIS_GATE_ID]).toBe('finalized');
    expect(rollback101[NEW_GATE_ID]).toBe('staged');
  }, 120_000);

  it('is a no-op (always finalized) when not running as a Serverless build', async () => {
    const root = createRootWithCorePlugins({
      rolloutGates: {
        dev: {
          buildNum: 100,
          gates: [NEW_GATE_ID],
        },
      },
    });

    await root.preboot();
    await root.setup();
    await root.start();

    try {
      const { body } = await getSupertest(root, 'get', `/internal/rollout_gates/${NEW_GATE_ID}`)
        .set('x-elastic-internal-origin', 'kibana')
        .expect(200);
      expect(body.phase).toBe('finalized');
      expect(body.noOpReason).toBe('not-serverless');
    } finally {
      await root.shutdown();
    }
  }, 60_000);
});
