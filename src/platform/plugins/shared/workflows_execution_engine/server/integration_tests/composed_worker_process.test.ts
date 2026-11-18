/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Proves a worker genuinely narrowed to a resolved pack selection still runs the workflow it was
 * narrowed for, by actually dispatching into real, forked/remote processes (`startWorkflowProcessHarness`)
 * instead of asserting on `resolveWorkflowTaskPacks`'s return value alone (that function and
 * `resolvePacksForDefinition` underneath it already have their own unit tests in
 * `get_workflow_task_packs.test.ts` and `resolve_packs_for_definition.test.ts`).
 *
 * Use `resolveWorkflowTaskPacks`, not `resolvePacksForDefinition` directly: the latter resolves step
 * types alone and is not what a dispatcher should send a worker. A worker started with exactly
 * `resolvePacksForDefinition`'s raw output for an all-built-in workflow (`[]`) crashes before it is
 * ready - `task_scheduling_contribution.ts` registers `workflow:resume`'s native scheduling schema,
 * needed for every workflow task type regardless of which steps a definition uses, and nothing in
 * `resolvePacksForDefinition` itself asks for it. `resolveWorkflowTaskPacks` already unions that pack
 * in unconditionally (`WORKFLOWS_TASK_SCHEDULING_PACK_ID`) for exactly this reason - this was found
 * while building this file, then traced back to code already written and already tested for it; the
 * first version of this test hand-listed the pack id itself, which was the wrong fix.
 *
 * Scope note: the plan asked for six cases (built-in, http, a spec connector, a cases step, a
 * security step, `ai.agent`). Only two are here. The other four each need their own dedicated
 * harness setup (saved object types, a solution's settings snapshot, a security plugin host, or a
 * stubbed LLM connector) on top of what this harness already does for plain step and connector
 * registration; standing that up is tracked separately rather than faked here with partial or
 * stubbed registrations. A third case - an `http` step dispatched to a worker given the baseline
 * pack but not the connector pack, to show today's decline path for a stock connector step - was
 * tried and dropped: the run did not fail quickly or cleanly in this harness (it hung rather than
 * surfacing a clean error), and chasing that down is its own piece of work, not something to paper
 * over here. Both cases below are genuinely run end to end, not stubbed.
 */

import { realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  readProcessRssMb,
  startWorkflowProcessHarness,
  WORKFLOW_PROCESS_TEST_MODES,
} from './workflow_process_harness';
import { resolveWorkflowTaskPacks } from '../lib/get_workflow_task_packs';

void readProcessRssMb;

const STACK_CONNECTORS_RULE_RUN_CONTRIBUTION = realpathSync(
  require.resolve('@kbn/stack-connectors-plugin/server/task_types/rule_run_contribution')
);

// `createRuleRunActions` registers `.http-system` as a system action type, but a run only has it
// without a saved object when Main actually sends it over as an in-memory connector (the same thing
// `createSystemConnectors` would produce for it); this test does that by hand rather than pulling in
// the whole actions plugin just to compute it.
const HTTP_SYSTEM_CONNECTOR = {
  id: 'system-connector-.http-system',
  actionTypeId: '.http-system',
  name: 'HTTP (system)',
  isMissingSecrets: false,
  config: {},
  secrets: {},
  isDeprecated: false,
  isPreconfigured: false,
  isSystemAction: true,
  isConnectorTypeDeprecated: false,
} as const;

/** A real HTTP target independent of the harness's own Kibana stub, so the `http` connector step has
 * somewhere real to call without reaching outside the test. */
const startTarget = async (): Promise<{
  url: string;
  hits: number[];
  stop: () => Promise<void>;
}> => {
  const hits: number[] = [];
  const server: Server = createServer((_req, res) => {
    hits.push(Date.now());
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/ping`,
    hits,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

describe.each(WORKFLOW_PROCESS_TEST_MODES)(
  'A worker narrowed to a built-in-only pack selection in $mode/$reuse',
  ({ mode, reuse }) => {
    let harness: Awaited<ReturnType<typeof startWorkflowProcessHarness>>;
    const steps = [{ name: 'write', type: 'data.set', with: { value: 42 } }];
    // What a real dispatcher resolves and persists for an all-built-in definition: the
    // task-scheduling pack, unconditionally unioned in, and nothing else (`resolvePacksForDefinition`
    // itself resolves to `[]` - no pack declares a built-in step type - which is exactly why
    // `resolveWorkflowTaskPacks`, not that function alone, is what a worker should be dispatched with).
    const packs = resolveWorkflowTaskPacks({ getTaskBundlePacks: () => [] }, 'workflow:run', {
      steps,
    } as never);

    beforeAll(async () => {
      expect(packs).toEqual([
        'task-scheduling:src/platform/plugins/shared/workflows_execution_engine/server/task_types/task_scheduling_contribution.ts',
      ]);
      harness = await startWorkflowProcessHarness({
        mode,
        reuse,
        packs,
        workflows: { builtins: { steps } },
      });
    });
    afterAll(async () => harness?.stop());

    it('runs the workflow in a worker that loaded one pack, not every pack', async () => {
      const failure = jest.fn();
      const { startRssMb, afterRunRssMb } = await harness.runMeasured('builtins', failure);
      expect(failure).not.toHaveBeenCalled();
      const [execution] = await harness.executionsOf('builtins');
      expect(execution).toEqual(expect.objectContaining({ status: 'completed' }));
      // A real sample where the harness could get one, not a fabricated number; `undefined` is
      // possible (the process answered before this loop's first poll caught its pid) and is not
      // itself a failure of the pack-selection behavior this test exists to check.
      // eslint-disable-next-line no-console
      console.log('[composed-worker] built-in-only RSS mb', { startRssMb, afterRunRssMb });
    });
  }
);

describe.each(WORKFLOW_PROCESS_TEST_MODES)(
  'An http step against a worker given every pack in $mode/$reuse',
  ({ mode, reuse }) => {
    let harness: Awaited<ReturnType<typeof startWorkflowProcessHarness>>;
    let target: Awaited<ReturnType<typeof startTarget>>;

    beforeAll(async () => {
      target = await startTarget();
      harness = await startWorkflowProcessHarness({
        mode,
        reuse,
        // No `packs` option: the pre-pack, every-pack-loaded behavior, as the control for the
        // previous case.
        additionalContributions: {
          'alerting-rule-run': [STACK_CONNECTORS_RULE_RUN_CONTRIBUTION],
        },
        inMemoryConnectors: [HTTP_SYSTEM_CONNECTOR],
        workflows: {
          http_call: {
            steps: [{ name: 'call', type: 'http', with: { url: target.url, method: 'GET' } }],
          },
        },
      });
    });
    afterAll(async () => {
      await harness?.stop();
      await target?.stop();
    });

    it('completes the run: the http system connector reaches a real server over the network', async () => {
      const failure = jest.fn();
      const { startRssMb, afterRunRssMb } = await harness.runMeasured('http_call', failure);
      expect(failure).not.toHaveBeenCalled();
      const [execution] = await harness.executionsOf('http_call');
      expect(execution).toEqual(expect.objectContaining({ status: 'completed' }));
      expect(target.hits.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log('[composed-worker] http (every pack) RSS mb', { startRssMb, afterRunRssMb });
    });
  }
);
