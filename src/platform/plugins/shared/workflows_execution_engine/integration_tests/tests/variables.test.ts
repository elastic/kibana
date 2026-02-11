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

describe('workflow with variables', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  function buildYaml() {
    return `
name: variables testing workflow
enabled: false

triggers:
  - type: manual

steps:  
  - name: initial_set
    type: data.set
    with:
      array: []
      primitive: 42

  - name: outer_loop
    type: foreach
    foreach: '["1", "3", "5"]'
    steps:
      - name: re_assign_init_1
        type: data.set
        with:
          array: '\${{variables.array | push: foreach.item}}'

      - name: inner_loop
        type: foreach
        foreach: '["2", "4", "6"]'
        steps:
          - name: re_assign_init_2
            type: data.set
            with:
              array: '\${{variables.array | push: foreach.item}}'

  - name: debug
    type: console
    with:
      message: '{{variables | json}}'
`;
  }

  it('should successfully execute workflow', async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml: buildYaml(),
    });
    const workflowExecutionDoc =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
    expect(workflowExecutionDoc?.error).toBe(undefined);
    expect(workflowExecutionDoc?.scopeStack).toEqual([]);
  });

  it('should have correct variable values in debug step', async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml: buildYaml(),
    });
    const debugStep = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((x) => x.stepId === 'debug');
    expect(debugStep).toBeDefined();
    const parsedMessage = JSON.parse(debugStep?.output as string);
    expect(parsedMessage.primitive).toBe(42);
    expect(parsedMessage.array).toEqual([
      '1',
      '2',
      '4',
      '6',
      '3',
      '2',
      '4',
      '6',
      '5',
      '2',
      '4',
      '6',
    ]);
  });
});
