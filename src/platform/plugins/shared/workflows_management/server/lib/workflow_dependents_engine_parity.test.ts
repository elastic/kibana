/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '@kbn/workflows-execution-engine/integration_tests/mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import { checkRun } from '../../common/lib/workflow_dependents/analyze_dependents';

/*
 * Compares the dependents analysis's "fails every run" verdict with what the engine does.
 *
 * Fixtures use two placeholder step types: `FAIL`, a step that always fails, and `MAYBE`, an action
 * step that may succeed or fail. The analyzer sees `FAIL` as a call to a turned-off workflow. The
 * engine runs every combination of `MAYBE` outcomes and of the boolean inputs `a` and `b`; the
 * workflow fails every run when all of those runs fail.
 *
 * A third placeholder, `CALL`, runs another fixture workflow. The analyzer sees a real call. The
 * engine fixture can't run child workflows, so each one runs first, and its call then becomes a
 * step that fails as its runs did: `FAIL` when they all failed, `MAYBE` when some did, and a
 * passing step when none did (or the call doesn't wait for the run).
 */

type Fixture = Record<string, unknown>;

const failingStep = { type: 'slack', 'connector-id': FakeConnectors.constantlyFailing.name };
const passingStep = { type: 'slack', 'connector-id': FakeConnectors.slack1.name };

const PLACEHOLDERS = new Set(['FAIL', 'MAYBE', 'CALL']);

const mapPlaceholders = (
  value: unknown,
  replace: (step: Record<string, unknown>) => Record<string, unknown>
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => mapPlaceholders(item, replace));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const record = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, mapPlaceholders(child, replace)])
  );
  return PLACEHOLDERS.has(String(record.type)) ? replace(record) : record;
};

const maybeStepNames = (fixture: Fixture): string[] => {
  const names: string[] = [];
  mapPlaceholders(fixture, (step) => {
    if (step.type === 'MAYBE') {
      names.push(String(step.name));
    }
    return step;
  });
  return names;
};

const forEngine = (fixture: Fixture, failingMaybes: ReadonlySet<string>): Fixture =>
  mapPlaceholders(fixture, ({ type, ...step }) => ({
    ...step,
    ...(type === 'FAIL' || failingMaybes.has(String(step.name)) ? failingStep : passingStep),
    with: { message: String(step.name) },
  })) as Fixture;

const forAnalyzer = (fixture: Fixture): Fixture =>
  mapPlaceholders(fixture, ({ type, to, async: isAsync, ...step }) => {
    if (type === 'CALL') {
      const stepType = isAsync ? 'workflow.executeAsync' : 'workflow.execute';
      return { ...step, type: stepType, with: { 'workflow-id': to } };
    }
    return type === 'FAIL'
      ? { ...step, type: 'workflow.execute', with: { 'workflow-id': 'broken' } }
      : { ...step, ...passingStep, with: { message: String(step.name) } };
  }) as Fixture;

type EngineVerdict = 'fails' | 'completes' | 'mixed';

// A step that runs a workflow fails when that run doesn't complete; one that doesn't wait for it
// only starts it.
const substituteCalls = (fixture: Fixture, verdicts: Record<string, EngineVerdict>): Fixture =>
  mapPlaceholders(fixture, (step) => {
    const { type, to, async: isAsync, ...rest } = step;
    if (type !== 'CALL') {
      return step;
    }
    const verdict = isAsync ? 'completes' : verdicts[String(to)];
    if (verdict === 'completes') {
      return { ...rest, ...passingStep, with: { message: String(rest.name) } };
    }
    return { ...rest, type: verdict === 'fails' ? 'FAIL' : 'MAYBE' };
  }) as Fixture;

const subsets = <T>(items: readonly T[]): T[][] =>
  items.reduce<T[][]>((all, item) => [...all, ...all.map((subset) => [...subset, item])], [[]]);

const INPUTS = [
  { a: false, b: false },
  { a: true, b: false },
  { a: false, b: true },
  { a: true, b: true },
];

const failing = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'FAIL',
  ...extra,
});
const maybe = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'MAYBE',
  ...extra,
});
const output = (name: string, values: Record<string, unknown> = {}, status?: string) => ({
  name,
  type: 'workflow.output',
  ...(status ? { status } : {}),
  with: values,
});
const done = output('done');
const ifA = (name: string, steps: unknown[], extra: Record<string, unknown> = {}) => ({
  name,
  type: 'if',
  condition: 'inputs.a : true',
  steps,
  ...extra,
});

const FIXTURES: Record<string, Fixture> = {
  'a failing step': { steps: [failing('f')] },
  'a failing step after one that may fail': { steps: [maybe('m'), failing('f')] },
  'a failing step that continues': { steps: [failing('f', { 'on-failure': { continue: true } })] },
  'a failing step that retries': {
    steps: [failing('f', { 'on-failure': { retry: { 'max-attempts': 2 } } })],
  },
  'a fallback that does not complete the run': {
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m')] } })],
  },
  'a fallback that completes the run': {
    steps: [failing('f', { 'on-failure': { fallback: [done] } })],
  },
  'a fallback that completes the run after a step that may fail': {
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m'), done] } })],
  },
  'a fallback that fails before completing': {
    steps: [failing('f', { 'on-failure': { fallback: [failing('g'), done] } })],
  },
  'a fallback whose outputs are rejected': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    steps: [
      failing('f', { 'on-failure': { fallback: [output('emit', { n: 'text' })] } }),
      output('end', { n: 1 }),
    ],
  },
  'a nested fallback that completes the run': {
    steps: [
      failing('f', {
        'on-failure': { fallback: [failing('g', { 'on-failure': { fallback: [done] } })] },
      }),
    ],
  },
  'a workflow-level fallback that completes the run': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [failing('f')],
  },
  'a workflow-level fallback that fails': {
    settings: { 'on-failure': { fallback: [failing('g'), done] } },
    steps: [failing('f')],
  },
  'a workflow-level continue': {
    settings: { 'on-failure': { continue: true } },
    steps: [failing('f')],
  },
  'a step-level handler that replaces the workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m')] } })],
  },
  'a failing step in an if': { steps: [ifA('i', [failing('f')])] },
  'a failing step in both branches': {
    steps: [ifA('i', [failing('f')], { else: [failing('g')] })],
  },
  'a failing step after a conditional completion': {
    steps: [ifA('i', [done]), failing('f')],
  },
  'a failing step after a completion': { steps: [done, failing('f')] },
  'a failing step in an if with its own continue': {
    steps: [ifA('i', [failing('f')], { 'on-failure': { continue: true } })],
  },
  'a failing step in a foreach': {
    steps: [{ name: 'loop', type: 'foreach', foreach: '[1, 2]', steps: [failing('f')] }],
  },
  'a failing step in a foreach over nothing': {
    steps: [{ name: 'loop', type: 'foreach', foreach: '[]', steps: [failing('f')] }],
  },
  'a failing step after a conditional loop.break': {
    steps: [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '[1, 2]',
        steps: [ifA('stop', [{ name: 'b', type: 'loop.break' }]), failing('f')],
      },
    ],
  },
  'a failing step in the first while iteration': {
    steps: [
      {
        name: 'loop',
        type: 'while',
        condition: 'inputs.a : true',
        'max-iterations': 2,
        steps: [failing('f')],
      },
    ],
  },
  'an end step that fails the run': { steps: [maybe('m'), output('stop', {}, 'failed')] },
  'a workflow.fail step': {
    steps: [{ name: 'stop', type: 'workflow.fail', with: { message: 'no' } }],
  },
  'an end step that fails the run, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [maybe('m'), output('stop', {}, 'failed')],
  },
  'an end step that fails the run, after a wait and a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [
      { name: 'pause', type: 'wait', with: { duration: '1ms' } },
      output('stop', {}, 'failed'),
    ],
  },
  'an end step that fails the run but fails to render first, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [output('stop', { message: '{{ "%" | url_decode }}' }, 'failed')],
  },
  'an end step that fails to render, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [output('emit', { message: '{{ "%" | url_decode }}' })],
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
  'a failing step that continues when a condition holds': {
    steps: [failing('f', { 'on-failure': { continue: 'inputs.a : true' } })],
  },
  'a failing step in every switch case and the default': {
    steps: [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ inputs.a }}',
        cases: [{ match: true, steps: [failing('f')] }],
        default: [failing('g')],
      },
    ],
  },
  'a failing step in every switch case, without a default': {
    steps: [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ inputs.a }}',
        cases: [{ match: true, steps: [failing('f')] }],
      },
    ],
  },
  'a failing parallel branch': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [failing('f')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a failing parallel branch that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [
          { name: 'one', steps: [failing('f')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [output('stop', {}, 'failed')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed, in a step that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [
          { name: 'one', steps: [output('stop', {}, 'failed')] },
          { name: 'two', steps: [failing('f')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed after a step that may fail': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [maybe('m'), output('stop', {}, 'failed')] },
          { name: 'two', steps: [maybe('n')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed after a step that may fail, in a step that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [{ name: 'one', steps: [maybe('m'), output('stop', {}, 'failed')] }],
      },
    ],
  },
  'a fallback that leaves the loop': {
    steps: [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '[1, 2]',
        steps: [failing('f', { 'on-failure': { fallback: [{ name: 'b', type: 'loop.break' }] } })],
      },
    ],
  },
  'a failing step in a nested fallback after a completing branch': {
    steps: [
      failing('f', {
        'on-failure': { fallback: [ifA('i', [done], { else: [failing('g')] })] },
      }),
    ],
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

const getStatus = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id')
    ?.status;

const toVerdict = (statuses: readonly string[]): EngineVerdict => {
  const failed = statuses.filter(
    (status) => status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED
  ).length;
  if (failed === statuses.length) {
    return 'fails';
  }
  return failed === 0 && statuses.every((status) => status === ExecutionStatus.COMPLETED)
    ? 'completes'
    : 'mixed';
};

const BROKEN = { id: 'broken', name: 'broken', enabled: false, definition: { steps: [] } };

describe('dependents analysis parity with the engine', () => {
  let workflowRunFixture: WorkflowRunFixture;

  // The statuses of every run of `fixture`: for each outcome of its `MAYBE` steps, and each input.
  const runEverywhere = async (fixture: Fixture): Promise<string[]> => {
    const statuses: string[] = [];
    for (const failingMaybes of subsets(maybeStepNames(fixture))) {
      const workflowYaml = YAML.stringify(forEngine(fixture, new Set(failingMaybes)));
      for (const inputs of INPUTS) {
        await workflowRunFixture.runWorkflow({ workflowYaml, inputs });
        await workflowRunFixture.driveToTerminal();
        statuses.push(String(getStatus(workflowRunFixture)));
      }
    }
    return statuses;
  };

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it.each(Object.entries(FIXTURES))(
    'agrees on whether every run fails: %s',
    async (_name, fixture) => {
      const statuses = await runEverywhere(fixture);
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
        verdicts[id] = toVerdict(await runEverywhere(substituteCalls(fixture, verdicts)));
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
