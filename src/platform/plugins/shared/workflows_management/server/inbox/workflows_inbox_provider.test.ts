/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { isInboxActionConflictError } from '@kbn/inbox-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  createWorkflowsInboxProvider,
  InvalidWorkflowSourceIdError,
  WORKFLOWS_INBOX_SOURCE_APP,
} from './workflows_inbox_provider';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';

const buildStep = (overrides: Partial<EsWorkflowStepExecution> = {}): EsWorkflowStepExecution => ({
  spaceId: 'default',
  id: 'step-exec-1',
  stepId: 'wait_approval',
  stepType: 'waitForInput',
  scopeStack: [],
  workflowRunId: 'run-1',
  workflowId: 'wf-1',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  startedAt: '2026-04-24T12:00:00.000Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  input: {
    message: 'Approve isolation of host-42?',
    schema: {
      type: 'object',
      properties: { approved: { type: 'boolean' } },
      required: ['approved'],
    },
  },
  ...overrides,
});

const ctx = () => ({
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
});

const fakeApi = () => {
  const api: Partial<WorkflowsManagementApi> = {
    listWaitingForInputSteps: jest.fn(async () => ({ results: [buildStep()], total: 1 })),
    resumeWorkflowExecution: jest.fn(async () => {}),
    // Default to "step is still waiting" so existing happy-path tests
    // remain unchanged after we added pre-resume verification.
    getStepExecution: jest.fn(async () => buildStep()),
  };
  return api as jest.Mocked<WorkflowsManagementApi>;
};

describe('createWorkflowsInboxProvider', () => {
  it('declares sourceApp = "workflows"', () => {
    const provider = createWorkflowsInboxProvider({
      api: fakeApi(),
      logger: loggerMock.create(),
    });
    expect(provider.sourceApp).toBe(WORKFLOWS_INBOX_SOURCE_APP);
  });

  describe('list()', () => {
    it('delegates to the management service and maps results to InboxActions', async () => {
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      const result = await provider.list({}, ctx());

      expect(api.listWaitingForInputSteps).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ page: 1, perPage: 1000 })
      );
      expect(result.total).toBe(1);
      expect(result.actions[0]).toMatchObject({
        source_app: 'workflows',
        source_id: 'wf-1:run-1:step-exec-1',
        status: 'pending',
        input_message: 'Approve isolation of host-42?',
      });
    });

    it('returns an empty list when the service returns no results', async () => {
      const api = fakeApi();
      (api.listWaitingForInputSteps as jest.Mock).mockResolvedValueOnce({
        results: [],
        total: 0,
      });
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      const result = await provider.list({}, ctx());

      expect(result).toEqual({ actions: [], total: 0 });
    });
  });

  describe('respond()', () => {
    it('calls resumeWorkflowExecution with the parsed executionId and the opaque input', async () => {
      const api = fakeApi();
      const logger = loggerMock.create();
      const provider = createWorkflowsInboxProvider({ api, logger });
      const c = ctx();

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true, reason: 'contained' }, c);

      expect(api.resumeWorkflowExecution).toHaveBeenCalledWith(
        'run-1',
        'default',
        { approved: true, reason: 'contained' },
        c.request
      );
    });

    it('verifies the targeted step is still waiting before forwarding to the engine', async () => {
      // Regression coverage for the inbox/workflows resume race:
      // the workflow-level status check inside the execution engine
      // does not distinguish *which* step is waiting, so a stale
      // response could silently advance an unrelated later HITL step.
      // The provider closes the cross-step leak by re-reading the step
      // doc keyed by `stepExecutionId` before forwarding.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true }, ctx());

      expect(api.getStepExecution).toHaveBeenCalledWith(
        { executionId: 'run-1', id: 'step-exec-1' },
        'default'
      );
      // Verify the lookup happens before the resume call so a stale
      // response cannot race past the check.
      const lookupOrder = (api.getStepExecution as jest.Mock).mock.invocationCallOrder[0];
      const resumeOrder = (api.resumeWorkflowExecution as jest.Mock).mock.invocationCallOrder[0];
      expect(lookupOrder).toBeLessThan(resumeOrder);
    });

    it('throws InboxActionConflictError when the step execution is not found', async () => {
      const api = fakeApi();
      (api.getStepExecution as jest.Mock).mockResolvedValueOnce(null);
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      const err = await provider
        .respond('wf-1:run-1:missing-step', { approved: true }, ctx())
        .catch((e: unknown) => e);

      expect(isInboxActionConflictError(err)).toBe(true);
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('throws InboxActionConflictError when the step is no longer in WAITING_FOR_INPUT status', async () => {
      // This is the dangerous case the check exists to prevent: the
      // first responder has already advanced the step (status flips off
      // `waiting_for_input`), but the second responder is racing to
      // submit input that — without this guard — would silently apply
      // to a *later* HITL step in the same workflow execution.
      const api = fakeApi();
      (api.getStepExecution as jest.Mock).mockResolvedValueOnce(
        buildStep({ status: ExecutionStatus.COMPLETED })
      );
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      const err = await provider
        .respond('wf-1:run-1:step-exec-1', { approved: true }, ctx())
        .catch((e: unknown) => e);

      expect(isInboxActionConflictError(err)).toBe(true);
      expect((err as Error).message).toMatch(/completed/);
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('throws InboxActionConflictError when the step execution is zombie-settled (finishedAt + status=waiting_for_input)', async () => {
      // Regression: a race between the workflow-level timeout monitor and the
      // waitForInput step can leave a doc with `status: waiting_for_input` AND
      // `finishedAt`/`error` set (the step is actually terminal). The
      // status-only pre-check would let the response through to the engine,
      // which would return a 500; this translates it to a clean 409 at the
      // provider boundary so the client sees a refreshable conflict.
      const api = fakeApi();
      (api.getStepExecution as jest.Mock).mockResolvedValueOnce(
        buildStep({
          status: ExecutionStatus.WAITING_FOR_INPUT,
          finishedAt: '2026-04-29T21:13:59.407Z',
          error: { type: 'TimeoutError', message: 'Failed due to workflow timeout' },
        })
      );
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      const err = await provider
        .respond('wf-1:run-1:step-exec-1', { approved: true }, ctx())
        .catch((e: unknown) => e);

      expect(isInboxActionConflictError(err)).toBe(true);
      expect((err as Error).message).toMatch(/already settled/);
      expect((err as Error).message).toMatch(/TimeoutError/);
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('throws InvalidWorkflowSourceIdError when source_id is malformed', async () => {
      const provider = createWorkflowsInboxProvider({
        api: fakeApi(),
        logger: loggerMock.create(),
      });

      await expect(provider.respond('invalid', {}, ctx())).rejects.toBeInstanceOf(
        InvalidWorkflowSourceIdError
      );
    });

    it('does not perform the step lookup when source_id is malformed', async () => {
      // Defensive: a malformed id has no addressable step, so we must
      // surface the `InvalidWorkflowSourceIdError` synchronously without
      // an extra ES round-trip.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({ api, logger: loggerMock.create() });

      await provider.respond('invalid', {}, ctx()).catch(() => undefined);

      expect(api.getStepExecution).not.toHaveBeenCalled();
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});
