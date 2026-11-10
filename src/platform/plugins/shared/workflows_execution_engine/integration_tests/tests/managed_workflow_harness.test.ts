/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ManagedWorkflowFakes,
  type ManagedWorkflowRun,
  type RunEnd,
  runManagedWorkflow,
} from '../managed_workflow_harness';
import { describeBranchCoverage, parseWorkflow, workflowInputErrors } from '../workflow_coverage';

const CHILD_WORKFLOW_ID = 'child-workflow';

const WORKFLOW = parseWorkflow(`
steps:
  - name: read
    type: elasticsearch.search
    with:
      index: logs
      query:
        match_all: {}
  - name: child
    type: workflow.execute
    if: "\${{ steps.read.output.hits.total.value > 0 }}"
    on-failure:
      continue: true
    with:
      workflow-id: ${CHILD_WORKFLOW_ID}
      inputs:
        count: "\${{ steps.read.output.hits.total.value }}"
  - name: notify
    type: kibana.request
    with:
      method: POST
      path: /api/notify
      body:
        result: "{{ steps.child.output.result }}"
  - name: done
    type: workflow.output
    with:
      result: "{{ steps.child.output.result }}"
`);

const searchResult = (hits: number) => ({
  took: 1,
  timed_out: false,
  hits: { total: { value: hits, relation: 'eq' }, hits: [] },
});

const fakes = (hits: number): ManagedWorkflowFakes => ({
  elasticsearchSteps: { read: searchResult(hits) },
  kibanaSteps: { notify: { status: 200, body: { acknowledged: true } } },
  childWorkflows: { [CHILD_WORKFLOW_ID]: { result: 'child-result' } },
});

const CASES: ReadonlyArray<{
  name: string;
  hits: number;
  failStep?: string;
  end: RunEnd;
  output?: Record<string, unknown>;
}> = [
  {
    name: 'the child runs and its output reaches the next steps',
    hits: 1,
    end: { ends: 'done' },
    output: { result: 'child-result' },
  },
  {
    name: 'the condition is false, so the child does not run',
    hits: 0,
    end: { ends: 'done' },
    output: { result: '' },
  },
  {
    name: 'the child fails, and the run goes on after it',
    hits: 1,
    failStep: 'child',
    end: { ends: 'done', failedSteps: ['child'] },
    output: { result: '' },
  },
  {
    name: 'a Kibana step fails by its name',
    hits: 1,
    failStep: 'notify',
    end: { ends: 'failed at notify' },
  },
  {
    name: 'an Elasticsearch step fails by its name',
    hits: 1,
    failStep: 'read',
    end: { ends: 'failed at read' },
  },
];

describe('managed workflow harness', () => {
  const runs = new Map<string, ManagedWorkflowRun>();

  beforeAll(async () => {
    for (const { name, hits, failStep } of CASES) {
      runs.set(
        name,
        await runManagedWorkflow({ workflow: WORKFLOW, inputs: {}, fakes: fakes(hits), failStep })
      );
    }
  });

  it.each(CASES)('$name', ({ name, end, output }) => {
    const run = runs.get(name);
    expect(run?.end).toEqual(end);
    expect(run?.output).toEqual(output);
  });

  it('records every faked call under the step that made it', () => {
    const calls = runs.get('the child runs and its output reaches the next steps')?.calls ?? [];
    expect(calls.map(({ kind, stepId, failed }) => ({ kind, stepId, failed }))).toEqual([
      { kind: 'elasticsearch', stepId: 'read', failed: false },
      { kind: 'child', stepId: 'child', failed: false },
      { kind: 'kibana', stepId: 'notify', failed: false },
    ]);
    // `${{ }}` keeps the type, so the child receives a number.
    expect(calls.find(({ kind }) => kind === 'child')?.input).toEqual({ count: 1 });
    expect(calls.find(({ kind }) => kind === 'kibana')?.input).toMatchObject({
      method: 'POST',
      path: '/api/notify',
      body: { result: 'child-result' },
    });
  });

  it('fails a step that has no fake, and names the missing fake', async () => {
    const run = await runManagedWorkflow({
      workflow: WORKFLOW,
      inputs: {},
      fakes: { ...fakes(1), kibanaSteps: {} },
    });
    expect(run.end).toEqual({ ends: 'failed at notify' });
    expect(run.error).toContain('No fake for Kibana step notify.');
  });

  it('refuses a failStep that the run never reaches', async () => {
    await expect(
      runManagedWorkflow({ workflow: WORKFLOW, inputs: {}, fakes: fakes(0), failStep: 'child' })
    ).rejects.toThrow('failStep "child" never ran');
  });

  it('does not count a skipped step as run when it has an `on-failure` fallback', async () => {
    const run = await runManagedWorkflow({
      workflow: parseWorkflow(`
steps:
  - name: skipped
    type: elasticsearch.search
    if: "\${{ 1 == 2 }}"
    on-failure:
      fallback:
        - name: recover
          type: elasticsearch.search
          with:
            index: logs
    with:
      index: logs
  - name: done
    type: workflow.output
    with:
      result: ok
`),
      inputs: {},
      fakes: {},
    });
    expect(run.end).toEqual({ ends: 'done' });
    expect(run.executedStepIds).toContain('if_skipped');
    expect(run.executedStepIds).not.toContain('skipped');
  });

  it('ends a run at the failed step, not at a later fallback step that continues', async () => {
    const run = await runManagedWorkflow({
      workflow: parseWorkflow(`
steps:
  - name: read
    type: elasticsearch.search
    on-failure:
      fallback:
        - name: note
          type: elasticsearch.search
          on-failure:
            continue: true
          with:
            index: notes
    with:
      index: logs
`),
      inputs: {},
      fakes: {},
    });
    expect(run.end).toEqual({ ends: 'failed at read', failedSteps: ['note'] });
  });

  describeBranchCoverage(WORKFLOW, () => [...runs.values()]);
});

describe('workflowInputErrors', () => {
  const CHILD = parseWorkflow(`
triggers:
  - type: manual
    inputs:
      properties:
        count:
          type: integer
      required: [count]
      additionalProperties: false
steps: []
`);

  it('accepts inputs that the trigger allows', () => {
    expect(workflowInputErrors(CHILD, { count: 1 })).toEqual([]);
  });

  it('names each input that the engine rejects', () => {
    expect(workflowInputErrors(CHILD, { count: '1', extra: true })).toEqual([
      'inputs.count: Invalid input: expected number, received string',
      'inputs: Unrecognized key: "extra"',
    ]);
  });
});
