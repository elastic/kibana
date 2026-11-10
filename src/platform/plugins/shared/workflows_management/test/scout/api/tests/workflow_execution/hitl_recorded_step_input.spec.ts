/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServer, type Server } from 'node:http';
import { getPlaywrightTagsFor } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ExecutionStatus,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const WAITING_TIMEOUT = 30_000;
const TERMINAL_TIMEOUT = 30_000;

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    approved: { type: 'boolean' },
    source: { type: 'string' },
  },
  required: ['approved', 'source'],
};

const APPROVAL_SCHEMA = {
  type: 'object',
  properties: {
    approved: {
      type: 'boolean',
      description: 'Whether the request was approved',
    },
  },
  required: ['approved'],
};

const inputWorkflowYaml = (notifyUrl: string) => `
name: Scout HITL recorded waitForInput
enabled: true
description: Records the wait input and notifies an external channel
triggers:
  - type: manual

steps:
  - name: ask
    type: waitForInput
    with:
      message: "Approve this action?"
      schema:
        type: object
        properties:
          approved:
            type: boolean
          source:
            type: string
        required:
          - approved
          - source
      channels:
        http:
          url: "${notifyUrl}"
          body: '{"form":"{{context.hitl.externalFormLink}}"}'
  - name: log_decision
    type: console
    with:
      message: "Decision: {{ steps.ask.output.response.approved }}"
`;

const approvalWorkflowYaml = (notifyUrl: string) => `
name: Scout HITL recorded waitForApproval
enabled: true
description: Records the approval input and notifies an external channel
triggers:
  - type: manual

steps:
  - name: ask
    type: waitForApproval
    with:
      message: "Approve this change?"
      approveLabel: Approve
      rejectLabel: Decline
      channels:
        http:
          url: "${notifyUrl}"
          body: '{"approve":"{{context.hitl.externalApproveLink}}","reject":"{{context.hitl.externalRejectLink}}"}'
  - name: log_decision
    type: console
    with:
      message: "Approved: {{ steps.ask.output.response.approved }}"
`;

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

const findAskStep = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined
): WorkflowStepExecutionDto | undefined => stepExecutions?.find((step) => step.stepId === 'ask');

const expectLiveToken = (state: unknown): void => {
  const record = asRecord(state);
  expect(typeof record?.[HITL_TOKEN_HASH_INPUT_FIELD]).toBe('string');
  expect((record?.[HITL_TOKEN_HASH_INPUT_FIELD] as string).length).toBeGreaterThan(0);
  expect(typeof record?.[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]).toBe('string');
  expect((record?.[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD] as string).length).toBeGreaterThan(0);
};

const expectClearedToken = (state: unknown): void => {
  const record = asRecord(state) ?? {};
  expect(record[HITL_TOKEN_HASH_INPUT_FIELD] ?? null).toBeNull();
  expect(record[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD] ?? null).toBeNull();
};

const recordedFields = (value: unknown): Record<string, unknown> => {
  const record = { ...(asRecord(value) ?? {}) };
  delete record[HITL_TOKEN_HASH_INPUT_FIELD];
  delete record[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD];
  return record;
};

const expectMirroredToken = (step: WorkflowStepExecutionDto | undefined): void => {
  expectLiveToken(step?.state);
  expectLiveToken(step?.input);
  expect(asRecord(step?.input)?.[HITL_TOKEN_HASH_INPUT_FIELD]).toBe(
    asRecord(step?.state)?.[HITL_TOKEN_HASH_INPUT_FIELD]
  );
  expect(asRecord(step?.input)?.[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]).toBe(
    asRecord(step?.state)?.[HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]
  );
};

const resumeEndpoint = (formOrActionUrl: string): string => {
  const url = new URL(formOrActionUrl);
  url.pathname = url.pathname.replace(/\/form$/, '');
  return url.toString();
};

const EXTERNAL_HEADERS = {
  'elastic-api-version': '2023-10-31',
  'kbn-xsrf': 'true',
} as const;

const postExternalInput = async (
  formUrl: string,
  body: Record<string, unknown>
): Promise<{ status: number; text: string }> => {
  const response = await fetch(resumeEndpoint(formUrl), {
    method: 'POST',
    headers: {
      ...EXTERNAL_HEADERS,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
};

const getExternalLink = async (url: string): Promise<{ status: number; text: string }> => {
  const response = await fetch(url, { headers: EXTERNAL_HEADERS });
  return { status: response.status, text: await response.text() };
};

// The resume link is delivered to a listener on this machine. Cloud Kibana cannot reach it.
const LOCAL_DEPLOYMENTS = [
  ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
  ...getPlaywrightTagsFor('serverless', 'search', 'local'),
  ...getPlaywrightTagsFor('serverless', 'observability_complete', 'local'),
  ...getPlaywrightTagsFor('serverless', 'security_complete', 'local'),
];

spaceTest.describe('HITL recorded step input', { tag: LOCAL_DEPLOYMENTS }, () => {
  let server: Server;
  let notifyUrl = '';
  const notificationBodies: string[] = [];

  spaceTest.beforeAll(async () => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        notificationBodies.push(Buffer.concat(chunks).toString('utf8'));
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('ok');
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (address == null || typeof address === 'string') {
      throw new Error('Notification listener did not bind a port');
    }
    notifyUrl = `http://127.0.0.1:${address.port}/hitl`;
  });

  spaceTest.beforeEach(() => {
    notificationBodies.length = 0;
  });

  spaceTest.afterAll(async ({ apiServices }) => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await apiServices.workflowsApi.deleteAll();
  });

  const waitUntilAskInput = async (
    workflowsApi: WorkflowsApiService,
    workflowExecutionId: string
  ): Promise<WorkflowExecutionDto> => {
    const execution = await workflowsApi.waitForStatus({
      workflowExecutionId,
      status: [ExecutionStatus.WAITING_FOR_INPUT, ExecutionStatus.FAILED],
      timeout: WAITING_TIMEOUT,
      includeInput: true,
      until: (next) => {
        if (next.status === ExecutionStatus.FAILED) {
          return true;
        }
        return asRecord(findAskStep(next.stepExecutions)?.input) != null;
      },
    });
    expect(execution.status, JSON.stringify(execution.error)).toBe(
      ExecutionStatus.WAITING_FOR_INPUT
    );
    return execution;
  };

  const linkFromNotification = async (key: string): Promise<string> => {
    const deadline = Date.now() + WAITING_TIMEOUT;
    let raw = notificationBodies.at(-1) ?? '';
    while (raw.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      raw = notificationBodies.at(-1) ?? '';
    }
    expect(raw.length, 'external channel did not receive the resume link').toBeGreaterThan(0);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const link = parsed[key];
    expect(typeof link).toBe('string');
    return link as string;
  };

  spaceTest(
    'waitForInput keeps its recorded input and accepts one external response',
    async ({ apiServices }) => {
      const { workflowsApi } = apiServices;
      const workflow = await workflowsApi.create(inputWorkflowYaml(notifyUrl));
      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const paused = await waitUntilAskInput(workflowsApi, workflowExecutionId);
      const askStep = findAskStep(paused.stepExecutions);
      const recordedInput = {
        message: 'Approve this action?',
        schema: INPUT_SCHEMA,
      };

      expect(recordedFields(askStep?.input)).toStrictEqual(recordedInput);
      expect(askStep?.output ?? null).toBeNull();
      expectMirroredToken(askStep);
      const formUrl = await linkFromNotification('form');

      const rejected = await postExternalInput(formUrl, { approved: true });
      expect(rejected.status, rejected.text).toBe(400);

      const stillWaiting = await workflowsApi.getExecution(workflowExecutionId, {
        includeInput: true,
      });
      const waitingStep = findAskStep(stillWaiting?.stepExecutions);
      expect(stillWaiting?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(recordedFields(waitingStep?.input)).toStrictEqual(recordedInput);
      expectMirroredToken(waitingStep);

      const accepted = await postExternalInput(formUrl, {
        approved: true,
        source: 'external-form',
      });
      expect(accepted.status).toBe(200);

      const completed = await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.COMPLETED,
        timeout: TERMINAL_TIMEOUT,
        includeInput: true,
        includeOutput: true,
      });
      const completedStep = findAskStep(completed.stepExecutions);
      expect(recordedFields(completedStep?.input)).toStrictEqual(recordedInput);
      expect(asRecord(completedStep?.output)?.response).toStrictEqual({
        approved: true,
        source: 'external-form',
      });
      expect(typeof asRecord(completedStep?.output)?.respondedBy).toBe('string');
      expectClearedToken(completedStep?.state);
      expectClearedToken(completedStep?.input);

      const second = await postExternalInput(formUrl, {
        approved: false,
        source: 'too-late',
      });
      expect(second.status).not.toBe(200);
      const afterSecond = await workflowsApi.getExecution(workflowExecutionId, {
        includeInput: true,
        includeOutput: true,
      });
      const afterSecondStep = findAskStep(afterSecond?.stepExecutions);
      expect(recordedFields(afterSecondStep?.input)).toStrictEqual(recordedInput);
      expect(asRecord(afterSecondStep?.output)?.response).toStrictEqual({
        approved: true,
        source: 'external-form',
      });
    }
  );

  spaceTest(
    'waitForApproval keeps its recorded input and accepts one external decision',
    async ({ apiServices }) => {
      const { workflowsApi } = apiServices;
      const workflow = await workflowsApi.create(approvalWorkflowYaml(notifyUrl));
      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});
      const paused = await waitUntilAskInput(workflowsApi, workflowExecutionId);
      const askStep = findAskStep(paused.stepExecutions);
      const recordedInput = {
        message: 'Approve this change?',
        approveLabel: 'Approve',
        rejectLabel: 'Decline',
        schema: APPROVAL_SCHEMA,
      };

      expect(recordedFields(askStep?.input)).toStrictEqual(recordedInput);
      expect(askStep?.output ?? null).toBeNull();
      expectMirroredToken(askStep);
      const rejectUrl = await linkFromNotification('reject');
      const approveUrl = await linkFromNotification('approve');
      const forged = new URL(rejectUrl);
      forged.searchParams.set('token', 'not-the-issued-token');

      const rejected = await getExternalLink(forged.toString());
      expect(rejected.status, rejected.text).toBe(401);
      const stillWaiting = await workflowsApi.getExecution(workflowExecutionId, {
        includeInput: true,
      });
      expect(stillWaiting?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(recordedFields(findAskStep(stillWaiting?.stepExecutions)?.input)).toStrictEqual(
        recordedInput
      );
      expectMirroredToken(findAskStep(stillWaiting?.stepExecutions));

      const accepted = await getExternalLink(rejectUrl);
      expect(accepted.status).toBe(200);

      const completed = await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.COMPLETED,
        timeout: TERMINAL_TIMEOUT,
        includeInput: true,
        includeOutput: true,
      });
      const completedStep = findAskStep(completed.stepExecutions);
      expect(recordedFields(completedStep?.input)).toStrictEqual(recordedInput);
      expect(asRecord(completedStep?.output)?.response).toStrictEqual({ approved: false });
      expectClearedToken(completedStep?.state);
      expectClearedToken(completedStep?.input);

      const second = await getExternalLink(approveUrl);
      expect(second.status).not.toBe(200);
      const afterSecond = await workflowsApi.getExecution(workflowExecutionId, {
        includeOutput: true,
        includeInput: true,
      });
      expect(recordedFields(findAskStep(afterSecond?.stepExecutions)?.input)).toStrictEqual(
        recordedInput
      );
      expect(asRecord(findAskStep(afterSecond?.stepExecutions)?.output)?.response).toStrictEqual({
        approved: false,
      });
    }
  );
});
