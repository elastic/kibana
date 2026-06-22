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
import { ExecutionStatus } from '@kbn/workflows';
import { createExternalResumeTokenPayload, signExternalResumeToken } from '@kbn/workflows/server';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { apiTest } from '../../fixtures';
import { SCOUT_EXTERNAL_RESUME_SIGNING_KEY } from '../../fixtures/constants';

const WAIT_FOR_APPROVAL_YAML = `
name: External Resume Scout Test
enabled: true
triggers:
  - type: manual
steps:
  - name: approval
    type: waitForApproval
    with:
      message: Approve scout external resume test?
  - name: done
    type: console
    with:
      message: approved
`;

const APPROVAL_STEP_ID = 'approval';
const SPACE_ID = 'default';
const WAIT_TIMEOUT_MS = 30_000;

function getApiKeyIdFromEncoded(encodedApiKey: string): string {
  return Buffer.from(encodedApiKey, 'base64').toString('utf8').split(':')[0];
}

function buildExternalResumeToken({
  executionId,
  encodedApiKey,
}: {
  executionId: string;
  encodedApiKey: string;
}): string {
  return signExternalResumeToken(
    createExternalResumeTokenPayload({
      spaceId: SPACE_ID,
      executionId,
      stepId: APPROVAL_STEP_ID,
      apiKeyId: getApiKeyIdFromEncoded(encodedApiKey),
      ttlMs: 60_000,
    }),
    SCOUT_EXTERNAL_RESUME_SIGNING_KEY
  );
}

function buildExternalResumePath(executionId: string, token: string, approved: boolean): string {
  const params = new URLSearchParams({
    token,
    approved: String(approved),
  });

  return `s/${SPACE_ID}/api/workflows/executions/${executionId}/resume/external?${params.toString()}`;
}

async function waitForApprovalStepInput(
  workflowsApi: WorkflowsApiService,
  workflowExecutionId: string
) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(workflowExecutionId, { includeInput: true }),
    condition: (execution) => {
      if (!execution || execution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
        return false;
      }

      const approvalStep = execution.stepExecutions.find(
        (stepExecution) => stepExecution.stepId === APPROVAL_STEP_ID
      );
      const input = approvalStep?.input as { externalResumeEncodedApiKey?: string } | undefined;

      return !!input?.externalResumeEncodedApiKey;
    },
    interval: 1000,
    timeout: WAIT_TIMEOUT_MS,
    errorMessage: (execution) =>
      `Execution ${workflowExecutionId} did not reach waitForApproval with resume credentials within ${WAIT_TIMEOUT_MS}ms (last status: ${execution?.status})`,
  });
}

apiTest.describe('External resume API', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let workflowId: string;

  apiTest.beforeAll(async ({ apiServices }) => {
    apiTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;

    const workflow = await workflowsApi.create(WAIT_FOR_APPROVAL_YAML);
    workflowId = workflow.id;
  });

  apiTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  apiTest(
    'resumes a waitForApproval execution via signed external link without session auth',
    async ({ apiClient }) => {
      const { workflowExecutionId } = await workflowsApi.run(workflowId, {});

      const waitingExecution = await waitForApprovalStepInput(workflowsApi, workflowExecutionId);
      const approvalStep = waitingExecution?.stepExecutions.find(
        (stepExecution) => stepExecution.stepId === APPROVAL_STEP_ID
      );
      const encodedApiKey = (approvalStep?.input as { externalResumeEncodedApiKey: string })
        .externalResumeEncodedApiKey;

      const token = buildExternalResumeToken({
        executionId: workflowExecutionId,
        encodedApiKey,
      });

      const resumeResponse = await apiClient.get(
        buildExternalResumePath(workflowExecutionId, token, true),
        {
          headers: {
            accept: 'text/html',
          },
        }
      );

      expect(resumeResponse).toHaveStatusCode(200);
      expect(resumeResponse.statusMessage).toContain('Your response was received');

      const completedExecution = await workflowsApi.waitForTermination({ workflowExecutionId });
      expect(completedExecution?.status).toBe(ExecutionStatus.COMPLETED);

      const reusedResponse = await apiClient.get(
        buildExternalResumePath(workflowExecutionId, token, true),
        {
          headers: {
            accept: 'text/html',
          },
        }
      );

      expect(reusedResponse).toHaveStatusCode(409);
      expect(reusedResponse.statusMessage).toContain('Unable to submit response');
    }
  );
});
