/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EngineVerdict,
  Fixture,
} from '@kbn/workflows-execution-engine/integration_tests/run_outcomes_parity_fixtures';
import {
  done,
  failing,
  forAnalyzer,
  ifA,
  maybe,
  output,
  runEverywhere,
  substituteCalls,
  toVerdict,
} from '@kbn/workflows-execution-engine/integration_tests/run_outcomes_parity_fixtures';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import { checkRun } from '../../common/lib/workflow_dependents/analyze_dependents';

/*
 * Compares the dependents analysis's "fails every run" verdict with what the engine does, for what
 * the compiled-graph analysis in `@kbn/workflows/graph` leaves to it: output values the declared
 * outputs reject, and calls between workflows. The engine's own parity test covers the rest.
 */

const FIXTURES: Record<string, Fixture> = {
  'a fallback whose outputs are rejected': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    steps: [
      failing('f', { 'on-failure': { fallback: [output('emit', { n: 'text' })] } }),
      output('end', { n: 1 }),
    ],
  },
  'an end step whose outputs are rejected, with a workflow-level fallback': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    settings: { 'on-failure': { fallback: [output('recover', { n: 1 })] } },
    steps: [output('emit', { n: 'text' })],
  },
  'an end step that fails the run with outputs it rejects, with a workflow-level fallback': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    settings: { 'on-failure': { fallback: [output('recover', { n: 1 })] } },
    steps: [output('stop', { n: 'text' }, 'failed')],
  },
  'an end step whose outputs are rejected': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    steps: [output('emit', { n: 'text' })],
  },
};

// Workflows that run each other with `CALL` steps (`to`, and `async` for `workflow.executeAsync`).
// The last one listed is the one checked.
const CALL_FIXTURES: Record<string, Record<string, Fixture>> = {
  'a call to a workflow that fails every run': {
    child: { steps: [failing('f')] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a call to a workflow that ends every run failed': {
    child: { steps: [maybe('m'), { name: 'stop', type: 'workflow.fail', with: {} }] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a call that continues, to a workflow that fails every run': {
    child: { steps: [failing('f')] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child', 'on-failure': { continue: true } }] },
  },
  'a call that starts, without waiting, a workflow that fails every run': {
    child: { steps: [failing('f')] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child', async: true }] },
  },
  'a call to a workflow that may fail': {
    child: { steps: [maybe('m')] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a call to a workflow that fails only in one branch': {
    child: { steps: [ifA('i', [failing('f')])] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a call to a workflow whose fallback completes the run': {
    child: { steps: [failing('f', { 'on-failure': { fallback: [done] } })] },
    parent: { steps: [{ name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a chain of calls to a workflow that fails every run': {
    grandchild: { steps: [failing('f')] },
    child: { steps: [maybe('m'), { name: 'g', type: 'CALL', to: 'grandchild' }] },
    parent: { steps: [ifA('i', [done]), { name: 'c', type: 'CALL', to: 'child' }] },
  },
  'a fallback that calls a workflow that fails every run': {
    child: { steps: [failing('f')] },
    parent: {
      steps: [
        maybe('m', {
          'on-failure': { fallback: [{ name: 'c', type: 'CALL', to: 'child' }, done] },
        }),
        output('stop', {}, 'failed'),
      ],
    },
  },
};

const BROKEN = { id: 'broken', name: 'broken', enabled: false, definition: { steps: [] } };

describe('dependents analysis parity with the engine', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it.each(Object.entries(FIXTURES))(
    'agrees on whether every run fails: %s',
    async (_name, fixture) => {
      const statuses = await runEverywhere(workflowRunFixture, fixture);
      const { failure, unchecked } = checkRun(
        { id: 'w', name: 'w', enabled: true, definition: forAnalyzer(fixture) },
        [BROKEN]
      );

      expect({
        analyzerFailsEveryRun: failure !== undefined,
        analyzerUnchecked: unchecked,
        engineStatuses: [...new Set(statuses)].sort(),
      }).toEqual({
        analyzerFailsEveryRun: toVerdict(statuses) === 'fails',
        analyzerUnchecked: undefined,
        engineStatuses: [...new Set(statuses)].sort(),
      });
    }
  );

  it.each(Object.entries(CALL_FIXTURES))(
    'agrees on whether every run fails across workflows: %s',
    async (_name, workflows) => {
      const verdicts: Record<string, EngineVerdict> = {};
      for (const [id, fixture] of Object.entries(workflows)) {
        verdicts[id] = toVerdict(
          await runEverywhere(workflowRunFixture, substituteCalls(fixture, verdicts))
        );
      }
      const items = Object.entries(workflows).map(([id, fixture]) => ({
        id,
        name: id,
        enabled: true,
        definition: forAnalyzer(fixture),
      }));
      const checked = items[items.length - 1];
      const { failure, unchecked } = checkRun(checked, [...items.slice(0, -1), BROKEN]);

      expect({
        analyzerFailsEveryRun: failure !== undefined,
        analyzerUnchecked: unchecked,
        verdicts,
      }).toEqual({
        analyzerFailsEveryRun: verdicts[checked.id] === 'fails',
        analyzerUnchecked: undefined,
        verdicts,
      });
    }
  );
});
