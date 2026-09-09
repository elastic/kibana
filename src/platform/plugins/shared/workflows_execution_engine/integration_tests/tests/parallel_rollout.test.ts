/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const executionId = 'fake_workflow_execution_id';
const definition = `
steps:
  - name: branches
    type: parallel
    foreach: [a, b]
    steps:
      - name: pause
        type: wait
        with: { duration: 1s }
      - name: result
        type: console
        with: { message: '{{ foreach.item }}' }
`;

describe('parallel execution rollout', () => {
  it.each([true, false])(
    'retains the persisted engine when the flag changes from %s',
    async (enabled) => {
      const fixture = new WorkflowRunFixture();
      jest.replaceProperty(fixture.configMock.parallel, 'cursorExecutionEnabled', enabled);
      await fixture.runWorkflow({ workflowYaml: definition });
      const workflow = () =>
        fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId);
      expect(workflow()?.executionMode).toBe(enabled ? 'parallel_v4' : 'legacy');
      expect(workflow()?.status).toBe(ExecutionStatus.WAITING);
      jest.replaceProperty(fixture.configMock.parallel, 'cursorExecutionEnabled', !enabled);
      const date = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
      try {
        await fixture.resumeWorkflow();
        expect(workflow()?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflow()?.executionMode).toBe(enabled ? 'parallel_v4' : 'legacy');
        expect(
          [...fixture.stepExecutionRepositoryMock.stepExecutions.values()]
            .filter((step) => step.stepId === 'result')
            .map((step) => step.output)
        ).toEqual(['a', 'b']);
      } finally {
        date.mockRestore();
        jest.restoreAllMocks();
      }
    }
  );

  it('rejects an unknown persisted engine instead of guessing how to resume it', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: definition });
    const workflow = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId);
    if (!workflow) throw new Error('Missing workflow');
    Reflect.set(workflow, 'executionMode', 'future_engine');
    await fixture.resumeWorkflow();
    expect(
      fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId)?.status
    ).toBe(ExecutionStatus.FAILED);
    expect(
      [...fixture.stepExecutionRepositoryMock.stepExecutions.values()].filter(
        (step) => step.stepId === 'result'
      )
    ).toEqual([]);
  });

  it('rejects nested branch control flow before side effects when the rollout is disabled', async () => {
    const fixture = new WorkflowRunFixture();
    jest.replaceProperty(fixture.configMock.parallel, 'cursorExecutionEnabled', false);
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: branches
    type: parallel
    foreach: [a, b]
    steps:
      - name: inner
        type: foreach
        foreach: [1, 2]
        steps:
          - name: forbidden
            type: console
            with: { message: forbidden }
`,
    });
    expect(
      fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId)?.status
    ).toBe(ExecutionStatus.FAILED);
    expect(fixture.stepExecutionRepositoryMock.stepExecutions.size).toBe(0);
    jest.restoreAllMocks();
  });
});
