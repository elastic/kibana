/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WorkflowManagementAuditActions,
  WorkflowManagementAuditLog,
} from './workflow_audit_logging';
import type { WorkflowsRequestHandlerContext } from '../../../types';

function createAuditContext() {
  const log = jest.fn();
  const context = {
    core: Promise.resolve({
      security: {
        audit: {
          logger: {
            enabled: true,
            log,
            includeSavedObjectNames: false,
          },
        },
      },
    }),
  } as unknown as WorkflowsRequestHandlerContext;
  return { context, log };
}

describe('WorkflowManagementAuditLog', () => {
  describe('when delegating to core security audit logger', () => {
    const err = new Error('boom');

    it('logWorkflowCreated (single)', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCreated(context, { id: 'w-1' });
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          message: 'User created workflow [id=w-1]',
          event: expect.objectContaining({
            action: WorkflowManagementAuditActions.CREATE,
            outcome: 'success',
            type: ['creation'],
            category: ['database'],
          }),
        })
      );
    });

    it('logWorkflowCreated (bulk import)', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCreated(context, {
        id: 'w-2',
        viaBulkImport: true,
      });
      expect(log.mock.calls[0][0].message).toContain('bulk import');
      expect(log.mock.calls[0][0].message).toContain('[id=w-2]');
    });

    it('logWorkflowCreateFailed (single vs bulk message)', async () => {
      const { context: c1, log: l1 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCreateFailed(c1, err);
      expect(l1.mock.calls[0][0].message).toBe('User failed to create a workflow');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCreateFailed(c2, err, { bulkOperation: true });
      expect(l2.mock.calls[0][0].message).toBe('User failed bulk workflow create');
    });

    it('logBulkCreateRowFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logBulkCreateRowFailed(context, {
        index: 2,
        id: 'bad',
        error: 'invalid yaml',
      });
      expect(log.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('[index=2]'),
          error: { code: 'bulk_create_row', message: 'invalid yaml' },
          event: expect.objectContaining({
            action: WorkflowManagementAuditActions.CREATE,
            outcome: 'failure',
          }),
        })
      );
    });

    it('logBulkWorkflowCreateResults', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logBulkWorkflowCreateResults(context, {
        created: [{ id: 'new-1' }, { id: 'new-2' }],
        failed: [{ index: 0, id: 'bad', error: 'nope' }],
      });
      expect(log).toHaveBeenCalledTimes(3);
      expect(log.mock.calls[0][0].message).toContain('bulk import');
      expect(log.mock.calls[0][0].message).toContain('[id=new-1]');
      expect(log.mock.calls[1][0].message).toContain('[id=new-2]');
      expect(log.mock.calls[2][0].error).toEqual({ code: 'bulk_create_row', message: 'nope' });
    });

    it('logWorkflowUpdated and logWorkflowUpdateFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowUpdated(context, { id: 'u-1' });
      expect(log.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.UPDATE);

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowUpdateFailed(c2, { id: 'u-1', error: err });
      expect(l2.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('[id=u-1]'),
          error: { code: 'Error', message: 'boom' },
        })
      );
    });

    it('logWorkflowDeleted and logWorkflowDeleteFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowDeleted(context, { id: 'd-1' });
      expect(log.mock.calls[0][0].event.type).toEqual(['deletion']);
      expect(log.mock.calls[0][0].message).toBe('User deleted workflow [id=d-1]');

      const { context: cBulk, log: lBulk } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowDeleted(cBulk, {
        id: 'd-2',
        viaBulkDelete: true,
      });
      expect(lBulk.mock.calls[0][0].message).toContain('via bulk delete');
      expect(lBulk.mock.calls[0][0].message).toContain('[id=d-2]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowDeleteFailed(c2, { id: 'd-1', error: err });
      expect(l2.mock.calls[0][0].event.type).toEqual(['deletion']);
      expect(l2.mock.calls[0][0].event.outcome).toBe('failure');
      expect(l2.mock.calls[0][0].message).toContain('User failed to delete workflow [id=d-1]');
      expect(l2.mock.calls[0][0].message).not.toContain('bulk delete');

      const { context: c3, log: l3 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowDeleteFailed(c3, {
        id: 'd-2',
        error: err,
        viaBulkDelete: true,
      });
      expect(l3.mock.calls[0][0].message).toContain('via bulk delete');
    });

    it('logBulkWorkflowDeleteResults and logBulkWorkflowDeleteFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logBulkWorkflowDeleteResults(context, {
        successfulIds: ['w1', 'w2'],
        failures: [{ id: 'w3', error: 'es error' }],
      });
      expect(log).toHaveBeenCalledTimes(3);
      expect(log.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.DELETE);
      expect(log.mock.calls[0][0].message).toContain('via bulk delete');
      expect(log.mock.calls[0][0].message).toContain('[id=w1]');
      expect(log.mock.calls[1][0].message).toContain('via bulk delete');
      expect(log.mock.calls[1][0].message).toContain('[id=w2]');
      expect(log.mock.calls[2][0].event.outcome).toBe('failure');
      expect(log.mock.calls[2][0].message).toContain('via bulk delete');
      expect(log.mock.calls[2][0].message).toContain('[id=w3]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logBulkWorkflowDeleteFailed(c2, err);
      expect(l2.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.BULK_DELETE);
    });

    it('logWorkflowCloned and logWorkflowCloneFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCloned(context, { sourceId: 'a', newId: 'b' });
      expect(log.mock.calls[0][0].message).toContain('sourceId=a');
      expect(log.mock.calls[0][0].message).toContain('[id=b]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowCloneFailed(c2, { sourceId: 'a', error: err });
      expect(l2.mock.calls[0][0].event.type).toEqual(['creation']);
    });

    it('logWorkflowExported, logWorkflowsExported, and logWorkflowExportFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowExported(context, { id: 'exp-1' });
      expect(log.mock.calls[0][0].event.type).toEqual(['access']);

      const { context: cBatch, log: lBatch } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowsExported(cBatch, { ids: ['a', 'b'] });
      expect(lBatch).toHaveBeenCalledTimes(2);
      expect(lBatch.mock.calls[0][0].message).toContain('[id=a]');
      expect(lBatch.mock.calls[1][0].message).toContain('[id=b]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowExportFailed(c2, err);
      expect(l2.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.EXPORT);
    });

    it('logWorkflowAccessed and logWorkflowAccessFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowAccessed(context, { id: 'g-1' });
      expect(log.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.GET);

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowAccessFailed(c2, { id: 'g-1', error: err });
      expect(l2.mock.calls[0][0].event.type).toEqual(['access']);
    });

    it('logWorkflowMget and logWorkflowMgetFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowMget(context, {
        requestedCount: 5,
        returnedCount: 3,
      });
      expect(log.mock.calls[0][0].message).toContain('requested 5');
      expect(log.mock.calls[0][0].message).toContain('returned 3');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowMgetFailed(c2, err);
      expect(l2.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.MGET);
    });

    it('logWorkflowRun and logWorkflowRunFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowRun(context, {
        workflowId: 'wf',
        executionId: 'ex',
      });
      expect(log.mock.calls[0][0].message).toContain('[id=wf]');
      expect(log.mock.calls[0][0].message).toContain('[executionId=ex]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowRunFailed(c2, { workflowId: 'wf', error: err });
      expect(l2.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.RUN);
    });

    it('logWorkflowTest with and without workflowId', async () => {
      const { context: c1, log: l1 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowTest(c1, {
        workflowExecutionId: 'e1',
        workflowId: 'w',
      });
      expect(l1.mock.calls[0][0].message).toContain('[workflowId=w]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowTest(c2, { workflowExecutionId: 'e2' });
      expect(l2.mock.calls[0][0].message).toContain('[draft yaml]');
    });

    it('logWorkflowTestFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowTestFailed(context, err);
      expect(log.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.TEST);
    });

    it('logWorkflowStepTest with and without workflowId', async () => {
      const { context: c1, log: l1 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowStepTest(c1, {
        stepId: 's1',
        workflowExecutionId: 'e1',
        workflowId: 'w',
      });
      expect(l1.mock.calls[0][0].message).toContain('[stepId=s1]');
      expect(l1.mock.calls[0][0].message).toContain('[workflowId=w]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowStepTest(c2, {
        stepId: 's2',
        workflowExecutionId: 'e2',
      });
      expect(l2.mock.calls[0][0].message).toContain('[draft yaml]');
    });

    it('logWorkflowStepTestFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logWorkflowStepTestFailed(context, err);
      expect(log.mock.calls[0][0].event.action).toBe(WorkflowManagementAuditActions.TEST_STEP);
    });

    it('logExecutionCanceled and logExecutionCancelFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logExecutionCanceled(context, { executionId: 'x-1' });
      expect(log.mock.calls[0][0].message).toContain('[executionId=x-1]');

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logExecutionCancelFailed(c2, {
        executionId: 'x-1',
        error: err,
      });
      expect(l2.mock.calls[0][0].event.action).toBe(
        WorkflowManagementAuditActions.CANCEL_EXECUTION
      );
    });

    it('logExecutionResumed and logExecutionResumeFailed', async () => {
      const { context, log } = createAuditContext();
      await WorkflowManagementAuditLog.logExecutionResumed(context, { executionId: 'r-1' });
      expect(log.mock.calls[0][0].event.action).toBe(
        WorkflowManagementAuditActions.RESUME_EXECUTION
      );

      const { context: c2, log: l2 } = createAuditContext();
      await WorkflowManagementAuditLog.logExecutionResumeFailed(c2, {
        executionId: 'r-1',
        error: err,
      });
      expect(l2.mock.calls[0][0].event.outcome).toBe('failure');
    });
  });
});
