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
import { isTerminalStatus } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

// ---------------------------------------------------------------------------
// Workflow YAML templates
// ---------------------------------------------------------------------------

const INTERNAL_API_YAML = `
name: kibana.request internal API Test
enabled: true
description: Tests invoking an internal Kibana API with a JSON body
triggers:
  - type: manual

steps:
  - name: internal_api_call
    type: kibana.request
    with:
      method: POST
      path: /s/{{workflow.spaceId}}/api/workflows/validate
      headers:
        elastic-api-version: "1"
      body:
        yaml: |
          name: valid workflow
          enabled: true
          triggers:
            - type: manual
          steps:
            - name: echo
              type: console
              with:
                message: "hello"
`;

const PUBLIC_API_YAML = `
name: kibana.request public API Test
enabled: true
description: Tests invoking a public Kibana API (GET /api/status)
triggers:
  - type: manual

steps:
  - name: public_api_call
    type: kibana.request
    with:
      method: GET
      path: /api/status
`;

const INTERNAL_API_MISSING_BODY_YAML = `
name: kibana.request missing body
enabled: true
triggers:
  - type: manual
steps:
  - name: internal_api_call
    type: kibana.request
    with:
      method: POST
      path: /s/{{workflow.spaceId}}/api/workflows/validate
      headers:
        elastic-api-version: "1"
`;

const INTERNAL_API_INVALID_BODY_YAML = `
name: kibana.request invalid body
enabled: true
triggers:
  - type: manual
steps:
  - name: internal_api_call
    type: kibana.request
    with:
      method: POST
      path: /s/{{workflow.spaceId}}/api/workflows/validate
      headers:
        elastic-api-version: "1"
      body:
        wrong_field: "this is not yaml"
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SYNC_POLL_TIMEOUT = 30_000;

async function waitForExecution(workflowsApi: WorkflowsApiService, executionId: string) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(executionId, { includeOutput: true }),
    condition: (exec) => !!exec && isTerminalStatus(exec.status ?? ''),
    interval: 1000,
    timeout: SYNC_POLL_TIMEOUT,
    errorMessage: (exec) =>
      `Execution ${executionId} did not terminate within ${SYNC_POLL_TIMEOUT}ms (last status: ${exec?.status})`,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

spaceTest.describe('kibana.request step execution', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let internalApiWorkflowId: string;
  let publicApiWorkflowId: string;
  let internalApiMissingBodyId: string;
  let internalApiInvalidBodyId: string;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;

    const internalWorkflow = await workflowsApi.create(INTERNAL_API_YAML);
    internalApiWorkflowId = internalWorkflow.id;

    const publicWorkflow = await workflowsApi.create(PUBLIC_API_YAML);
    publicApiWorkflowId = publicWorkflow.id;

    const missingBodyWorkflow = await workflowsApi.create(INTERNAL_API_MISSING_BODY_YAML);
    internalApiMissingBodyId = missingBodyWorkflow.id;

    const invalidBodyWorkflow = await workflowsApi.create(INTERNAL_API_INVALID_BODY_YAML);
    internalApiInvalidBodyId = invalidBodyWorkflow.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  spaceTest('invokes an internal API with a body successfully', async () => {
    const { workflowExecutionId } = await workflowsApi.run(internalApiWorkflowId, {});

    const execution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

    // Check the step output
    const apiCallStep = execution?.stepExecutions.find((s) => s.stepId === 'internal_api_call');
    expect(apiCallStep).toBeDefined();

    const output = apiCallStep?.output as Record<string, unknown>;

    // Validate the response body content from the validate API
    // (kibana.request returns the body directly when include_response_headers is false)
    expect(output).toBeDefined();

    const responseBody = output as Record<string, unknown>;
    expect(responseBody?.valid).toBe(true);
    expect(Array.isArray(responseBody?.diagnostics)).toBe(true);
  });

  spaceTest('invokes a public API without a body successfully', async () => {
    const { workflowExecutionId } = await workflowsApi.run(publicApiWorkflowId, {});

    const execution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

    // Check the step output
    const apiCallStep = execution?.stepExecutions.find((s) => s.stepId === 'public_api_call');
    expect(apiCallStep).toBeDefined();

    const output = apiCallStep?.output as Record<string, unknown>;

    // Validate that the request step returned a 200 OK (in some environments GET /api/status might return different codes so let's allow it to be an object from our response)
    // Looking at the logs, the object itself is being returned as output without status/body envelope, or the output is mapped directly to the body.
    expect(output).toBeDefined();

    // In kibana.request, if \`include_response_headers\` isn't used, the output is directly the parsed body, not an object with {status, body}
    // Looking at the console output above, the output is directly the response body (e.g., {"core": {...}})
    // Validate the response body content from the status API
    const responseBody = output as Record<string, unknown>;
    expect(responseBody?.status).toBeDefined();
    expect((responseBody?.status as Record<string, unknown>)?.overall).toBeDefined();
  });

  spaceTest('fails when missing required body', async () => {
    const { workflowExecutionId } = await workflowsApi.run(internalApiMissingBodyId, {});
    const execution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(execution?.status).toBe(ExecutionStatus.FAILED);

    const apiCallStep = execution?.stepExecutions.find((s) => s.stepId === 'internal_api_call');
    expect(apiCallStep).toBeDefined();

    // Validation fails because 'yaml' is required
    const errorMessage = apiCallStep?.error?.message ?? '';
    expect(errorMessage).toContain('HTTP 400');
  });

  spaceTest('fails when sending an invalid body payload', async () => {
    const { workflowExecutionId } = await workflowsApi.run(internalApiInvalidBodyId, {});
    const execution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(execution?.status).toBe(ExecutionStatus.FAILED);

    const apiCallStep = execution?.stepExecutions.find((s) => s.stepId === 'internal_api_call');
    expect(apiCallStep).toBeDefined();

    // Validation fails because 'yaml' is missing/invalid
    const errorMessage = apiCallStep?.error?.message ?? '';
    expect(errorMessage).toContain('HTTP 400');
  });
});
