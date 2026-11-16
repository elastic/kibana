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
import { FakeConnectors } from './mocks/actions_plugin_mock';
import type { WorkflowRunFixture } from './workflow_run_fixture';

/*
 * Fixtures that compare a static "fails every run" verdict with what the engine does.
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

export type Fixture = Record<string, unknown>;

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

export const forAnalyzer = (fixture: Fixture): Fixture =>
  mapPlaceholders(fixture, ({ type, to, async: isAsync, ...step }) => {
    if (type === 'CALL') {
      const stepType = isAsync ? 'workflow.executeAsync' : 'workflow.execute';
      return { ...step, type: stepType, with: { 'workflow-id': to } };
    }
    return type === 'FAIL'
      ? { ...step, type: 'workflow.execute', with: { 'workflow-id': 'broken' } }
      : { ...step, ...passingStep, with: { message: String(step.name) } };
  }) as Fixture;

export type EngineVerdict = 'fails' | 'completes' | 'mixed';

// A step that runs a workflow fails when that run doesn't complete; one that doesn't wait for it
// only starts it.
export const substituteCalls = (
  fixture: Fixture,
  verdicts: Record<string, EngineVerdict>
): Fixture =>
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

export const failing = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'FAIL',
  ...extra,
});
export const maybe = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'MAYBE',
  ...extra,
});
export const output = (name: string, values: Record<string, unknown> = {}, status?: string) => ({
  name,
  type: 'workflow.output',
  ...(status ? { status } : {}),
  with: values,
});
export const done = output('done');
export const ifA = (name: string, steps: unknown[], extra: Record<string, unknown> = {}) => ({
  name,
  type: 'if',
  condition: 'inputs.a : true',
  steps,
  ...extra,
});

const getStatus = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id')
    ?.status;

export const toVerdict = (statuses: readonly string[]): EngineVerdict => {
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

/** The statuses of every run of `fixture`: for each outcome of its `MAYBE` steps, and each input. */
export const runEverywhere = async (
  workflowRunFixture: WorkflowRunFixture,
  fixture: Fixture
): Promise<string[]> => {
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
