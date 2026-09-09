/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const example = (name: string) =>
  readFileSync(join(__dirname, '../../examples/parallel_audit', `${name}.yml`), 'utf8');
const workflow = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');
const executions = (fixture: WorkflowRunFixture, stepId: string) =>
  [...fixture.stepExecutionRepositoryMock.stepExecutions.values()].filter(
    (step) => step.stepId === stepId
  );
const outputs = (fixture: WorkflowRunFixture, stepId: string) =>
  executions(fixture, stepId)
    .map((step) => step.output)
    .sort();
const drain = async (fixture: WorkflowRunFixture) => {
  let now = Date.now();
  for (let tick = 0; tick < 20 && workflow(fixture)?.status === ExecutionStatus.WAITING; tick++) {
    now += 2000;
    const date = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      await fixture.resumeWorkflow();
    } finally {
      date.mockRestore();
    }
  }
};

describe('parallel edge-case review workflows', () => {
  it('keeps foreach/while break and continue scoped to each branch and selects switch paths', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: example('07_loop_control') });
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(outputs(fixture, 'item_result')).toEqual(['left:0', 'left:2', 'right:0', 'right:2']);
    expect(outputs(fixture, 'iteration_result')).toEqual([
      'left:0',
      'left:2',
      'right:0',
      'right:2',
    ]);
    expect(outputs(fixture, 'left_path')).toEqual(['left']);
    expect(outputs(fixture, 'default_path')).toEqual(['right']);
    expect(outputs(fixture, 'result')).toEqual(['left', 'right']);
    expect(executions(fixture, 'select_path')).toHaveLength(2);
    expect(executions(fixture, 'select_path').map((step) => step.status)).toEqual([
      ExecutionStatus.COMPLETED,
      ExecutionStatus.COMPLETED,
    ]);
  });

  it('does not reuse branch positions or results across enclosing foreach iterations', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: example('08_parallel_in_foreach') });
    await drain(fixture);
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(outputs(fixture, 'task_result')).toEqual(['A:1', 'A:2', 'B:1', 'B:2']);
    expect(executions(fixture, 'tasks')).toHaveLength(2);
    expect(executions(fixture, 'batch_result')).toHaveLength(2);
  });

  it('joins empty fan-out, empty loops, and skipped terminal conditions', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: example('09_empty_and_skipped') });
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(executions(fixture, 'never_empty')).toHaveLength(0);
    expect(executions(fixture, 'never_loop')).toHaveLength(0);
    expect(executions(fixture, 'empty')[0].output).toMatchObject({ total: 0, succeeded: 0 });
    expect(executions(fixture, 'branches')[0].output).toMatchObject({ total: 2, succeeded: 2 });
  });

  it('releases and reacquires local admission across repeated durable waits', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: example('11_wait_admission') });
    await drain(fixture);
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    for (const stepId of ['started', 'middle', 'result']) {
      expect(outputs(fixture, stepId)).toEqual(['a', 'b', 'c']);
    }
  });

  it('schedules the enclosing step timeout before descendant wait timers', async () => {
    const fixture = new WorkflowRunFixture();
    const started = Date.now();
    await fixture.runWorkflow({ workflowYaml: example('22_overall_timeout') });
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.WAITING);
    const tasks = fixture.taskManagerMock.schedule.mock.calls.map(([task]) => task);
    expect(tasks.some((task) => task.runAt && task.runAt.getTime() <= started + 2500)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await fixture.resumeWorkflow();
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(outputs(fixture, 'recovery')).toEqual(['recovered']);
    expect(outputs(fixture, 'joined')).toEqual(['recovered']);
    expect(executions(fixture, 'after_wait')).toHaveLength(0);
    for (const step of executions(fixture, 'long_wait'))
      expect(step.status).toBe(ExecutionStatus.TIMED_OUT);
  });

  it('wakes at the outer branch deadline and terminates all parked descendants', async () => {
    const fixture = new WorkflowRunFixture();
    const started = Date.now();
    await fixture.runWorkflow({ workflowYaml: example('10_deadline_before_wait') });
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.WAITING);
    const parent = executions(fixture, 'branches')[0];
    expect(new Date(String(parent.state?.resumeAt)).getTime()).toBeLessThanOrEqual(started + 2500);
    const date = jest.spyOn(Date, 'now').mockReturnValue(started + 2500);
    try {
      await fixture.resumeWorkflow();
    } finally {
      date.mockRestore();
    }
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(executions(fixture, 'after_wait')).toHaveLength(0);
    expect(executions(fixture, 'long_wait')).toHaveLength(4);
    for (const step of executions(fixture, 'long_wait'))
      expect(step.status).toBe(ExecutionStatus.TIMED_OUT);
    expect(executions(fixture, 'branches')[0].output).toMatchObject({ total: 2, failed: 2 });
  });
});

describe('parallel failure handling at the join', () => {
  const failingExample = (name: string) =>
    example(name).replace(
      /^( +)type: http$/gm,
      `$1type: ${FakeConnectors.constantlyFailing.actionTypeId}\n$1connector-id: ${FakeConnectors.constantlyFailing.name}`
    );

  it('retries the whole parallel with distinct attempt scopes before parent fallback', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: failingExample('17_parent_retry') });
    await drain(fixture);
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.FAILED);
    expect(executions(fixture, 'fail')).toHaveLength(4);
    expect(outputs(fixture, 'recovery')).toEqual(['recovered']);
    expect(executions(fixture, 'parent_after')).toHaveLength(0);
  });

  it('continues after parent retry/fallback only when continue is explicitly enabled', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: failingExample('19_parent_retry_continue') });
    await drain(fixture);
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(executions(fixture, 'fail')).toHaveLength(4);
    expect(outputs(fixture, 'recovery')).toEqual(['recovered']);
    expect(outputs(fixture, 'parent_after')).toEqual(['done']);
  });

  it('drains already-started siblings but never admits queued branches after fail-fast', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: failingExample('12_fail_fast_queue') });
    await drain(fixture);
    expect(workflow(fixture)?.status).toBe(ExecutionStatus.FAILED);
    expect(outputs(fixture, 'active_result')).toEqual(['drained']);
    expect(executions(fixture, 'never_queued')).toHaveLength(0);
    expect(executions(fixture, 'after_join')).toHaveLength(0);
    expect(executions(fixture, 'branches')[0].output).toMatchObject({
      results: [{ status: 'failed' }, { status: 'completed' }, { status: 'skipped' }],
    });
  });
});
