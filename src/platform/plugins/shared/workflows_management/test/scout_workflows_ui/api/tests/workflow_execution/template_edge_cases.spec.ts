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

const TEMPLATE_NONEXISTENT_STEP_YAML = `
name: Template Nonexistent Step
enabled: true
description: References a step that does not exist
triggers:
  - type: manual
steps:
  - name: step_1
    type: console
    with:
      message: "value is: $\{{steps.nonexistent_step.output}}"
`;

const JSON_PARSE_FILTER_INVALID_YAML = `
name: Json Parse Invalid
enabled: true
description: json_parse filter on non-JSON string
triggers:
  - type: manual
consts:
  not_json: "this is not json"
steps:
  - name: parse_step
    type: console
    with:
      message: "$\{{consts.not_json | json_parse}}"
`;

const TEMPLATE_CHAINED_STEPS_YAML = `
name: Template Chained Steps
enabled: true
description: Tests multi-step output chaining
triggers:
  - type: manual
steps:
  - name: step_1
    type: console
    with:
      message: "first output"
  - name: step_2
    type: console
    with:
      message: "step_1 output was: $\{{steps.step_1.output.message}}"
  - name: step_3
    type: console
    with:
      message: "step_2 output was: $\{{steps.step_2.output.message}}"
`;

const TEMPLATE_SPECIAL_CHARS_YAML = `
name: Template Special Characters
enabled: true
description: Templates with characters that are special in YAML
triggers:
  - type: manual
consts:
  colon_value: "key: value"
  hash_value: "before # after"
  bracket_value: "[1, 2, 3]"
steps:
  - name: log_colon
    type: console
    with:
      message: "Colon: $\{{consts.colon_value}}"
  - name: log_hash
    type: console
    with:
      message: "Hash: $\{{consts.hash_value}}"
  - name: log_bracket
    type: console
    with:
      message: "Bracket: $\{{consts.bracket_value}}"
`;

const ENTRIES_FILTER_YAML = `
name: Entries Filter Test
enabled: true
description: Tests the entries Liquid filter for iterating object keys
triggers:
  - type: manual
consts:
  data:
    name: "Alice"
    age: 30
    role: "admin"
steps:
  - name: iterate_entries
    type: foreach
    foreach: "$\{{consts.data | entries}}"
    steps:
      - name: log_entry
        type: console
        with:
          message: "key=$\{{foreach.item.key}}, value=$\{{foreach.item.value}}"
`;

const ENTRIES_FILTER_EMPTY_OBJECT_YAML = `
name: Entries Filter Empty Object
enabled: true
description: Tests entries filter on empty object
triggers:
  - type: manual
consts:
  empty_data: {}
steps:
  - name: iterate_empty
    type: foreach
    foreach: "$\{{consts.empty_data | entries}}"
    steps:
      - name: log_entry
        type: console
        with:
          message: "should not execute"
  - name: after_empty_loop
    type: console
    with:
      message: "After empty loop"
`;

spaceTest.describe('Template engine edge cases', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest(
    'referencing nonexistent step output — does not crash, produces empty or error',
    async () => {
      const workflow = await workflowsApi.create(TEMPLATE_NONEXISTENT_STEP_YAML);

      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

      expect(execution).toBeDefined();
      expect([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]).toContain(execution?.status);
    }
  );

  spaceTest('json_parse filter with non-JSON string returns original value', async () => {
    const workflow = await workflowsApi.create(JSON_PARSE_FILTER_INVALID_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  spaceTest('multi-step output chaining works correctly', async () => {
    const workflow = await workflowsApi.create(TEMPLATE_CHAINED_STEPS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.stepExecutions).toHaveLength(3);
  });

  spaceTest('templates with YAML-special characters render without corruption', async () => {
    const workflow = await workflowsApi.create(TEMPLATE_SPECIAL_CHARS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.stepExecutions).toHaveLength(3);
  });

  spaceTest('entries filter iterates over object keys', async () => {
    const workflow = await workflowsApi.create(ENTRIES_FILTER_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const entrySteps = execution?.stepExecutions.filter((s) => s.stepId === 'log_entry');
    expect(entrySteps).toHaveLength(3);
  });

  spaceTest('entries filter on empty object produces zero iterations', async () => {
    const workflow = await workflowsApi.create(ENTRIES_FILTER_EMPTY_OBJECT_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    const entrySteps = execution?.stepExecutions.filter((s) => s.stepId === 'log_entry');
    expect(entrySteps).toHaveLength(0);
    const afterStep = execution?.stepExecutions.find((s) => s.stepId === 'after_empty_loop');
    expect(afterStep).toBeDefined();
  });
});
