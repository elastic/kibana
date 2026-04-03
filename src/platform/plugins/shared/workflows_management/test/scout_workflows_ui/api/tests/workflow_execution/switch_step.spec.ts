/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const SWITCH_BASIC_YAML = `
name: Switch Basic Test
enabled: true
description: Tests basic switch routing with string matching
triggers:
  - type: manual
inputs:
  - name: status
    type: string
    default: "success"
steps:
  - name: route_status
    type: switch
    expression: $\{{inputs.status}}
    cases:
      - match: "success"
        steps:
          - name: on_success
            type: console
            with:
              message: "MATCHED_SUCCESS"
      - match: "failure"
        steps:
          - name: on_failure
            type: console
            with:
              message: "MATCHED_FAILURE"
    default:
      - name: on_default
        type: console
        with:
          message: "MATCHED_DEFAULT"
  - name: after_switch
    type: console
    with:
      message: "AFTER_SWITCH"
`;

const SWITCH_NUMERIC_COERCION_YAML = `
name: Switch Numeric Coercion
enabled: true
description: Tests type coercion — numeric match vs string expression
triggers:
  - type: manual
steps:
  - name: route_code
    type: switch
    expression: "200"
    cases:
      - match: 200
        steps:
          - name: numeric_match
            type: console
            with:
              message: "MATCHED_NUMERIC_200"
      - match: "404"
        steps:
          - name: string_match
            type: console
            with:
              message: "MATCHED_STRING_404"
  - name: after_switch
    type: console
    with:
      message: "AFTER_SWITCH"
`;

const SWITCH_NO_DEFAULT_YAML = `
name: Switch No Default
enabled: true
description: Tests switch with no matching case and no default branch
triggers:
  - type: manual
steps:
  - name: route_value
    type: switch
    expression: "apple"
    cases:
      - match: "banana"
        steps:
          - name: banana_path
            type: console
            with:
              message: "BANANA"
      - match: "cherry"
        steps:
          - name: cherry_path
            type: console
            with:
              message: "CHERRY"
  - name: after_switch
    type: console
    with:
      message: "AFTER_SWITCH_EXECUTED"
`;

const SWITCH_INSIDE_FOREACH_YAML = `
name: Switch Inside Foreach
enabled: true
description: Switch evaluated per iteration inside foreach
triggers:
  - type: manual
steps:
  - name: process_items
    type: foreach
    foreach: '[{"type": "a"}, {"type": "b"}, {"type": "a"}]'
    steps:
      - name: route_item
        type: switch
        expression: $\{{foreach.item.type}}
        cases:
          - match: "a"
            steps:
              - name: handle_a
                type: console
                with:
                  message: "TYPE_A at index $\{{foreach.index}}"
          - match: "b"
            steps:
              - name: handle_b
                type: console
                with:
                  message: "TYPE_B at index $\{{foreach.index}}"
`;

const SWITCH_BOOLEAN_YAML = `
name: Switch Boolean Coercion
enabled: true
description: Tests boolean coercion in switch expression
triggers:
  - type: manual
steps:
  - name: route_bool
    type: switch
    expression: "true"
    cases:
      - match: true
        steps:
          - name: bool_true
            type: console
            with:
              message: "MATCHED_BOOL_TRUE"
      - match: "false"
        steps:
          - name: string_false
            type: console
            with:
              message: "MATCHED_STRING_FALSE"
    default:
      - name: default_path
        type: console
        with:
          message: "MATCHED_DEFAULT"
`;

const SWITCH_EMPTY_EXPRESSION_YAML = `
name: Switch Empty Expression
enabled: true
description: Tests switch when expression evaluates to empty string
triggers:
  - type: manual
inputs:
  - name: value
    type: string
    default: ""
steps:
  - name: route_empty
    type: switch
    expression: $\{{inputs.value}}
    cases:
      - match: "something"
        steps:
          - name: something_path
            type: console
            with:
              message: "SOMETHING"
    default:
      - name: default_path
        type: console
        with:
          message: "EMPTY_DEFAULT"
`;

spaceTest.describe('Switch step execution', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(120_000);
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('routes to correct case branch based on input value', async () => {
    const workflow = await workflowsApi.create(SWITCH_BASIC_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, { status: 'success' });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    expect(stepIds).toContain('on_success');
    expect(stepIds).not.toContain('on_failure');
    expect(stepIds).not.toContain('on_default');
    expect(stepIds).toContain('after_switch');
  });

  spaceTest('routes to default branch when no case matches', async () => {
    const workflow = await workflowsApi.create(SWITCH_BASIC_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {
      status: 'unknown_value',
    });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    expect(stepIds).toContain('on_default');
    expect(stepIds).not.toContain('on_success');
    expect(stepIds).not.toContain('on_failure');
    expect(stepIds).toContain('after_switch');
  });

  spaceTest('numeric match value coerces to string for comparison', async () => {
    const workflow = await workflowsApi.create(SWITCH_NUMERIC_COERCION_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    expect(stepIds).toContain('numeric_match');
    expect(stepIds).toContain('after_switch');
  });

  spaceTest(
    'no matching case and no default — skips switch body, continues execution',
    async () => {
      const workflow = await workflowsApi.create(SWITCH_NO_DEFAULT_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
      expect(stepIds).not.toContain('banana_path');
      expect(stepIds).not.toContain('cherry_path');
      expect(stepIds).toContain('after_switch');
    }
  );

  spaceTest('evaluates switch per iteration inside foreach', async () => {
    const workflow = await workflowsApi.create(SWITCH_INSIDE_FOREACH_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    const handleACount = stepIds.filter((id) => id === 'handle_a').length;
    const handleBCount = stepIds.filter((id) => id === 'handle_b').length;
    expect(handleACount).toBe(2);
    expect(handleBCount).toBe(1);
  });

  spaceTest('boolean match value coerces correctly via String()', async () => {
    const workflow = await workflowsApi.create(SWITCH_BOOLEAN_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    expect(stepIds).toContain('bool_true');
    expect(stepIds).not.toContain('default_path');
  });

  spaceTest('empty expression falls through to default', async () => {
    const workflow = await workflowsApi.create(SWITCH_EMPTY_EXPRESSION_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, { value: '' });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const stepIds = execution?.stepExecutions.map((s) => s.stepId) ?? [];
    expect(stepIds).toContain('default_path');
    expect(stepIds).not.toContain('something_path');
  });
});
