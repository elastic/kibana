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

const REQUIRED_INPUTS_YAML = `
name: Required Inputs Workflow
enabled: true
description: Tests input validation with required fields
triggers:
  - type: manual
inputs:
  type: object
  properties:
    name:
      type: string
    age:
      type: number
  required:
    - name
    - age
steps:
  - name: greet
    type: console
    with:
      message: "Hello $\{{inputs.name}}, age $\{{inputs.age}}"
`;

const OPTIONAL_INPUTS_WITH_DEFAULTS_YAML = `
name: Optional Inputs Defaults
enabled: true
description: Tests input defaults are applied when inputs omitted
triggers:
  - type: manual
inputs:
  - name: greeting
    type: string
    default: "hello world"
steps:
  - name: log_greeting
    type: console
    with:
      message: "$\{{inputs.greeting}}"
`;

const NESTED_OBJECT_INPUTS_YAML = `
name: Nested Object Inputs
enabled: true
description: Tests deeply nested input validation
triggers:
  - type: manual
inputs:
  type: object
  properties:
    config:
      type: object
      properties:
        retries:
          type: number
        endpoint:
          type: string
      required:
        - endpoint
  required:
    - config
steps:
  - name: log_config
    type: console
    with:
      message: "Endpoint: $\{{inputs.config.endpoint}}"
`;

const WRONG_TYPE_INPUTS_YAML = `
name: Wrong Type Inputs
enabled: true
description: Tests type mismatch in inputs
triggers:
  - type: manual
inputs:
  type: object
  properties:
    count:
      type: number
  required:
    - count
steps:
  - name: log_count
    type: console
    with:
      message: "Count: $\{{inputs.count}}"
`;

spaceTest.describe('Input validation', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('succeeds with all required inputs provided', async () => {
    const workflow = await workflowsApi.create(REQUIRED_INPUTS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {
      name: 'Alice',
      age: 30,
    });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  spaceTest('fails when required inputs are missing', async () => {
    const workflow = await workflowsApi.create(REQUIRED_INPUTS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.FAILED);
  });

  spaceTest('fails when only some required inputs are provided', async () => {
    const workflow = await workflowsApi.create(REQUIRED_INPUTS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, { name: 'Alice' });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.FAILED);
  });

  spaceTest('applies default values when inputs are omitted', async () => {
    const workflow = await workflowsApi.create(OPTIONAL_INPUTS_WITH_DEFAULTS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  spaceTest('validates nested object required fields', async () => {
    const workflow = await workflowsApi.create(NESTED_OBJECT_INPUTS_YAML);

    const successExec = await workflowsApi.run(workflow.id, {
      config: { endpoint: 'https://example.com', retries: 3 },
    });
    const successResult = await workflowsApi.waitForTermination({
      workflowExecutionId: successExec.workflowExecutionId,
    });
    expect(successResult?.status).toBe(ExecutionStatus.COMPLETED);

    const failExec = await workflowsApi.run(workflow.id, {
      config: { retries: 3 },
    });
    const failResult = await workflowsApi.waitForTermination({
      workflowExecutionId: failExec.workflowExecutionId,
    });
    expect(failResult?.status).toBe(ExecutionStatus.FAILED);
  });

  spaceTest('fails on type mismatch — string provided for number field', async () => {
    const workflow = await workflowsApi.create(WRONG_TYPE_INPUTS_YAML);

    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {
      count: 'not_a_number',
    });
    const execution = await workflowsApi.waitForTermination({ workflowExecutionId });

    expect(execution?.status).toBe(ExecutionStatus.FAILED);
  });
});
