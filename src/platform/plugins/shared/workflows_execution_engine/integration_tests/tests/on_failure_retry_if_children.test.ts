/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

// The revision-settle path relies on this: wrapping an `if` step in
// `on-failure.retry` re-runs the block's children, so the resolve step inside
// re-executes before the write that depends on it. If the engine retried only
// the leaf, a conflict would leave the stale id in place.
describe('retry of a flow-control step re-runs its children', () => {
  let workflowRunFixture: WorkflowRunFixture;
  beforeAll(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  function buildYaml(): string {
    return `
steps:
  - name: settle_block
    type: if
    condition: '\${{ true }}'
    on-failure:
      retry:
        max-attempts: 2
        condition: '\${{ error.type == "Error" }}'
    steps:
      - name: re_resolve
        type: data.set
        with:
          resolved_id: new_head
      - name: do_write
        type: ${FakeConnectors.transientlyFailing.actionTypeId}
        connector-id: ${FakeConnectors.transientlyFailing.name}
        with:
          failures: 1
          text: written
  - name: after
    type: data.set
    with:
      done: true
`;
  }

  beforeAll(async () => {
    jest.clearAllMocks();
    await workflowRunFixture.runWorkflow({ workflowYaml: buildYaml() });
  });

  it('lets the workflow complete after the conflict clears', () => {
    const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(doc?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('re-ran the preceding resolve step once per attempt', () => {
    const resolveExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((se) => se.stepId === 're_resolve');
    // 1 initial + 1 retry. If children were not re-run, this stays at 1.
    expect(resolveExecutions.length).toBe(2);
  });

  it('ran the failing write once per attempt (1 initial + 1 retry = success)', () => {
    const writeExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((se) => se.stepId === 'do_write');
    expect(writeExecutions.length).toBe(2);
    const anyOk = writeExecutions.some((se) => !se.error);
    expect(anyOk).toBe(true);
  });

  it('still ran the step after the retried block', () => {
    const after = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((se) => se.stepId === 'after');
    expect(after.length).toBe(1);
  });
});
