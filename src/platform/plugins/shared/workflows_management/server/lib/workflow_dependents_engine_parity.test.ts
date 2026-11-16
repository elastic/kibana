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
import { findRunFailure } from '../../common/lib/workflow_dependents/analyze_dependents';

/*
 * Compares the dependents analysis's "fails every run" verdict with what the engine does.
 *
 * Fixtures use two placeholder step types: `FAIL`, a step that always fails, and `MAYBE`, an action
 * step that may succeed or fail. The analyzer sees `FAIL` as a call to a turned-off workflow. The
 * engine runs every combination of `MAYBE` outcomes and of the boolean inputs `a` and `b`; the
 * workflow fails every run when all of those runs fail.
 */

type Fixture = Record<string, unknown>;

const failingStep = { type: 'slack', 'connector-id': FakeConnectors.constantlyFailing.name };
const passingStep = { type: 'slack', 'connector-id': FakeConnectors.slack1.name };

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
  return record.type === 'FAIL' || record.type === 'MAYBE' ? replace(record) : record;
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
  mapPlaceholders(fixture, ({ type, ...step }) =>
    type === 'FAIL'
      ? { ...step, type: 'workflow.execute', with: { 'workflow-id': 'broken' } }
      : { ...step, ...passingStep, with: { message: String(step.name) } }
  ) as Fixture;

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
  'an end step whose outputs are rejected': {
    outputs: [{ name: 'n', type: 'number', required: true }],
    steps: [output('emit', { n: 'text' })],
  },
};

// Workflows that fail every run though the analysis doesn't tell: it treats every branch and loop
// body as one that might not run.
const KNOWN_MISSES = new Set(['a failing step in both branches', 'a failing step in a foreach']);

const getStatus = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id')
    ?.status;

describe('dependents analysis parity with the engine', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it.each(Object.entries(FIXTURES))(
    'agrees on whether every run fails: %s',
    async (name, fixture) => {
      const statuses: string[] = [];
      for (const failingMaybes of subsets(maybeStepNames(fixture))) {
        const workflowYaml = YAML.stringify(forEngine(fixture, new Set(failingMaybes)));
        for (const inputs of INPUTS) {
          await workflowRunFixture.runWorkflow({ workflowYaml, inputs });
          await workflowRunFixture.driveToTerminal();
          statuses.push(String(getStatus(workflowRunFixture)));
        }
      }
      const engineFailsEveryRun = statuses.every(
        (status) => status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED
      );

      const analyzerFailure = findRunFailure(
        { id: 'w', name: 'w', enabled: true, definition: forAnalyzer(fixture) },
        [{ id: 'broken', name: 'broken', enabled: false, definition: { steps: [] } }]
      );

      expect({
        analyzerFailsEveryRun: analyzerFailure !== undefined,
        engineStatuses: [...new Set(statuses)].sort(),
      }).toEqual({
        analyzerFailsEveryRun: engineFailsEveryRun && !KNOWN_MISSES.has(name),
        engineStatuses: [...new Set(statuses)].sort(),
      });
      if (KNOWN_MISSES.has(name)) {
        expect(engineFailsEveryRun).toBe(true);
      }
    }
  );
});
