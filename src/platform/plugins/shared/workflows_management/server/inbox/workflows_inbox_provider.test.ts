/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  isInboxActionConflictError,
  isInvalidInboxActionSourceIdError,
} from '@kbn/inbox-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  createWorkflowsInboxProvider,
  WORKFLOWS_INBOX_SOURCE_APP,
} from './workflows_inbox_provider';
import type { WorkflowManagementAuditLog } from '../api/routes/utils/workflow_audit_logging';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';

function createTestAudit(): WorkflowManagementAuditLog {
  return { logExecutionResumed: jest.fn() } as unknown as WorkflowManagementAuditLog;
}

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

const ctx = (overrides: { channel?: string } = {}) => ({
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
  ...overrides,
});

const fakeApi = () => {
  const api: Partial<WorkflowsManagementApi> = {
    listWaitingForInputSteps: jest.fn(async () => ({
      results: [buildStep()],
      total: 1,
      reasoningByStepId: new Map(),
      deletedWorkflowIds: new Set<string>(),
    })),
    listProcessedWaitForInputSteps: jest.fn(async () => ({
      results: [
        buildStep({
          id: 'step-exec-2',
          status: ExecutionStatus.COMPLETED,
          finishedAt: '2026-04-24T12:30:00.000Z',
          output: { approved: true, reason: 'looks good' },
        }),
      ],
      total: 1,
      reasoningByStepId: new Map(),
      deletedWorkflowIds: new Set<string>(),
    })),
    resumeWorkflowExecution: jest.fn(async () => ({ resumedBy: 'user' })),
    // Default to "step is still waiting" so existing happy-path tests
    // remain unchanged after we added pre-resume verification.
    getStepExecution: jest.fn(async () => buildStep()),
    // Audit-stamp on the step doc fires synchronously before the
    // resume — see HITL multi-client design.
    markStepAsResponded: jest.fn(async () => true),
  };
  return api as jest.Mocked<WorkflowsManagementApi>;
};

describe('createWorkflowsInboxProvider', () => {
  it('declares sourceApp = "workflows"', () => {
    const provider = createWorkflowsInboxProvider({
      api: fakeApi(),
      logger: loggerMock.create(),
      audit: createTestAudit(),
    });
    expect(provider.sourceApp).toBe(WORKFLOWS_INBOX_SOURCE_APP);
  });

  describe('list()', () => {
    it('delegates to the management service and maps results to InboxActions', async () => {
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

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
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const result = await provider.list({}, ctx());

      expect(result).toEqual({ actions: [], total: 0 });
    });
  });

  describe('listProcessed()', () => {
    it('delegates to listProcessedWaitForInputSteps and maps results to history InboxActions', async () => {
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const result = await provider.listProcessed!({}, ctx());

      expect(api.listProcessedWaitForInputSteps).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ page: 1, perPage: 1000 })
      );
      expect(result.total).toBe(1);
      expect(result.actions[0]).toMatchObject({
        source_app: 'workflows',
        // v1 placeholder until per-action approve/reject conventions
        // ride on top of the new respondedBy/At/channel audit fields.
        status: 'approved',
        response_mode: 'responded',
        response_input: { approved: true, reason: 'looks good' },
      });
    });

    it('flags history rows whose parent workflow has been deleted via source_deleted', async () => {
      const api = fakeApi();
      (api.listProcessedWaitForInputSteps as jest.Mock).mockResolvedValueOnce({
        results: [
          buildStep({
            id: 'step-exec-deleted',
            workflowId: 'wf-gone',
            status: ExecutionStatus.COMPLETED,
            finishedAt: '2026-04-24T12:30:00.000Z',
            output: { approved: true },
          }),
          buildStep({
            id: 'step-exec-alive',
            workflowId: 'wf-1',
            status: ExecutionStatus.COMPLETED,
            finishedAt: '2026-04-24T12:31:00.000Z',
            output: { approved: true },
          }),
        ],
        total: 2,
        reasoningByStepId: new Map(),
        deletedWorkflowIds: new Set(['wf-gone']),
      });
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const result = await provider.listProcessed!({}, ctx());

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0]).toMatchObject({ source_deleted: true });
      expect(result.actions[1]).toMatchObject({ source_deleted: false });
    });

    it('returns an empty list when there is no processed history', async () => {
      const api = fakeApi();
      (api.listProcessedWaitForInputSteps as jest.Mock).mockResolvedValueOnce({
        results: [],
        total: 0,
      });
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const result = await provider.listProcessed!({}, ctx());

      expect(result).toEqual({ actions: [], total: 0 });
    });
  });

  describe('respond()', () => {
    it('calls resumeWorkflowExecution with the parsed executionId and the opaque input', async () => {
      const api = fakeApi();
      const logger = loggerMock.create();
      const provider = createWorkflowsInboxProvider({ api, logger, audit: createTestAudit() });
      const c = ctx();

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true, reason: 'contained' }, c);

      expect(api.resumeWorkflowExecution).toHaveBeenCalledWith(
        'run-1',
        'default',
        { approved: true, reason: 'contained' },
        c.request
      );
    });

    it('forwards the responder-supplied channel from ctx into the audit-stamp call', async () => {
      // Non-UI clients (MCP, Slack bot, agent builder) tag their channel
      // explicitly via the respond route's request body. The provider
      // must pass that through to `markStepAsResponded` verbatim — no
      // hardcoded `'inbox'` literal — so the audit feed renders the
      // correct "via …" attribution.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });
      const c = ctx({ channel: 'example-mcp-app-security' });

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true }, c);

      expect(api.markStepAsResponded).toHaveBeenCalledWith(
        'step-exec-1',
        c.request,
        'example-mcp-app-security',
        'default'
      );
    });

    it('falls back to channel="inbox" when ctx.channel is undefined (defence-in-depth)', async () => {
      // The respond HTTP route already defaults to `'inbox'` for
      // omitted-channel bodies, but the provider keeps a belt-and-suspenders
      // fallback so a future caller that builds an `InboxRequestContext`
      // without a channel doesn't end up persisting `undefined` into the
      // audit feed.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });
      const c = ctx();

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true }, c);

      expect(api.markStepAsResponded).toHaveBeenCalledWith(
        'step-exec-1',
        c.request,
        'inbox',
        'default'
      );
    });

    it('audit-stamps the step doc with channel="inbox" before scheduling the resume', async () => {
      // Why this ordering matters:
      //   1. `markStepAsResponded` writes `respondedAt` with
      //      `refresh: 'wait_for'`, which immediately drops the row from
      //      pending (it has `must_not: respondedAt`) and surfaces it in
      //      history (`should: respondedAt`). This is the bridge that
      //      makes the inbox multi-client safe — every client sees the
      //      response land regardless of which Task Manager polls the
      //      resume task first.
      //   2. If the resume schedule fails *after* the audit write, the
      //      next list pass surfaces a row with `respondedAt` set but
      //      still in `WAITING_FOR_INPUT` — recoverable. The reverse
      //      ordering would let a successful resume race past its own
      //      audit write.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });
      const c = ctx();

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true }, c);

      expect(api.markStepAsResponded).toHaveBeenCalledWith(
        'step-exec-1',
        c.request,
        'inbox',
        'default'
      );
      const auditOrder = (api.markStepAsResponded as jest.Mock).mock.invocationCallOrder[0];
      const resumeOrder = (api.resumeWorkflowExecution as jest.Mock).mock.invocationCallOrder[0];
      expect(auditOrder).toBeLessThan(resumeOrder);
    });

    it('does not resume if the audit-stamp write fails', async () => {
      // The audit stamp is the source-of-truth claim that removes the row from
      // pending for every client. If it fails, scheduling the resume would
      // create a window where the workflow advanced but the durable audit row
      // was never claimed.
      const api = fakeApi();
      (api.markStepAsResponded as jest.Mock).mockRejectedValueOnce(new Error('audit boom'));
      const logger = loggerMock.create();
      const provider = createWorkflowsInboxProvider({
        api,
        logger,
        audit: createTestAudit(),
      });

      await expect(
        provider.respond('wf-1:run-1:step-exec-1', { approved: true }, ctx())
      ).rejects.toThrow('audit boom');

      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to mark step step-exec-1 as responded')
      );
    });

    it('throws InboxActionConflictError when the audit stamp was already claimed', async () => {
      const api = fakeApi();
      (api.markStepAsResponded as jest.Mock).mockResolvedValueOnce(false);
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const err = await provider
        .respond('wf-1:run-1:step-exec-1', { approved: true }, ctx())
        .catch((e: unknown) => e);

      expect(isInboxActionConflictError(err)).toBe(true);
      expect((err as Error).message).toContain('already claimed');
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('emits the same security audit as the resume HTTP route after a successful inbox resume', async () => {
      // Parity with the resume HTTP route's security audit (added in
      // #256603): the inbox path must emit the same `logExecutionResumed`
      // event with the engine-resolved `resumedBy` so the audit trail is
      // consistent regardless of which client triggered the resume.
      const api = fakeApi();
      const audit = createTestAudit();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit,
      });
      const c = ctx();

      await provider.respond('wf-1:run-1:step-exec-1', { approved: true }, c);

      expect(audit.logExecutionResumed).toHaveBeenCalledWith(c.request, {
        executionId: 'run-1',
        resumedBy: 'user',
      });
    });

    it('emits a security audit failure event when resumeWorkflowExecution rejects', async () => {
      const api = fakeApi();
      const boom = new Error('engine unavailable');
      (api.resumeWorkflowExecution as jest.Mock).mockRejectedValueOnce(boom);
      const audit = createTestAudit();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit,
      });
      const c = ctx();

      await expect(
        provider.respond('wf-1:run-1:step-exec-1', { approved: true }, c)
      ).rejects.toThrow(boom);

      expect(audit.logExecutionResumed).toHaveBeenCalledWith(c.request, {
        executionId: 'run-1',
        error: boom,
      });
    });

    it('verifies the targeted step is still waiting before forwarding to the engine', async () => {
      // Regression coverage for the inbox/workflows resume race:
      // the workflow-level status check inside the execution engine
      // does not distinguish *which* step is waiting, so a stale
      // response could silently advance an unrelated later HITL step.
      // The provider closes the cross-step leak by re-reading the step
      // doc keyed by `stepExecutionId` before forwarding.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

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
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

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
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

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
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const err = await provider
        .respond('wf-1:run-1:step-exec-1', { approved: true }, ctx())
        .catch((e: unknown) => e);

      expect(isInboxActionConflictError(err)).toBe(true);
      expect((err as Error).message).toMatch(/already settled/);
      expect((err as Error).message).toMatch(/TimeoutError/);
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('throws InvalidInboxActionSourceIdError when source_id is malformed', async () => {
      const provider = createWorkflowsInboxProvider({
        api: fakeApi(),
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      const err = await provider.respond('invalid', {}, ctx()).catch((e: unknown) => e);
      expect(isInvalidInboxActionSourceIdError(err)).toBe(true);
    });

    it('does not perform the step lookup when source_id is malformed', async () => {
      // Defensive: a malformed id has no addressable step, so we must
      // surface the `InvalidInboxActionSourceIdError` synchronously without
      // an extra ES round-trip.
      const api = fakeApi();
      const provider = createWorkflowsInboxProvider({
        api,
        logger: loggerMock.create(),
        audit: createTestAudit(),
      });

      await provider.respond('invalid', {}, ctx()).catch(() => undefined);

      expect(api.getStepExecution).not.toHaveBeenCalled();
      expect(api.resumeWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});
