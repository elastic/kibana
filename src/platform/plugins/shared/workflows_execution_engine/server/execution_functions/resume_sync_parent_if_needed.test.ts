/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { createMockLogger } from './execution_functions_test_utils';
import { resumeSyncParentIfNeeded } from './resume_sync_parent_if_needed';

const PARENT_EXECUTION_ID = 'parent-exec-1';
const CHILD_EXECUTION_ID = 'child-exec-1';
const SPACE_ID = 'default';

const createChildExecution = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
  ({
    id: CHILD_EXECUTION_ID,
    status: ExecutionStatus.COMPLETED,
    context: {
      parentWorkflowInvocation: 'sync',
      parentWorkflowExecutionId: PARENT_EXECUTION_ID,
    },
    ...overrides,
  } as EsWorkflowExecution);

describe('resumeSyncParentIfNeeded', () => {
  let logger: ReturnType<typeof createMockLogger>;
  let internalResumeWorkflowExecution: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    internalResumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
  });

  describe('parent execution identity', () => {
    it('resumes the parent without a request so it wakes its own pre-scheduled resume task', async () => {
      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution(),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(internalResumeWorkflowExecution).toHaveBeenCalledWith(
        PARENT_EXECUTION_ID,
        SPACE_ID,
        undefined
      );

      // The 4th argument is the `request`. Any value here makes
      // internalResumeWorkflowExecution take its request-present branch, which deletes the
      // parent's pre-scheduled resume task and reschedules from the caller's identity. After a
      // child HITL approval the child runs as the approver, so passing anything derived from
      // the child would leak the approver's identity into the parent.
      const [, , , request] = internalResumeWorkflowExecution.mock.calls[0];
      expect(request).toBeUndefined();
    });

    it('does not resume the parent under a descendant identity when the child completes after a HITL approval', async () => {
      // A child that was resumed by an approver reaches a terminal status like any other child.
      // Nothing about that child may influence which identity the parent resumes under.
      const approvedChild = createChildExecution({
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: PARENT_EXECUTION_ID,
          resumedBy: 'approver@elastic.co',
        },
      } as Partial<EsWorkflowExecution>);

      await resumeSyncParentIfNeeded({
        childExecution: approvedChild,
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).toHaveBeenCalledWith(
        PARENT_EXECUTION_ID,
        SPACE_ID,
        undefined
      );
    });

    it('does not write context into the parent when resuming it', async () => {
      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution(),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      // `resumedBy` / `resumeInput` belong to the child's HITL step, not to the parent.
      const [, , context] = internalResumeWorkflowExecution.mock.calls[0];
      expect(context).toBeUndefined();
    });
  });

  describe('when the resume fails', () => {
    it('logs an error and does not schedule a replacement resume task', async () => {
      internalResumeWorkflowExecution.mockRejectedValue(new Error('task not found'));

      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution(),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`parent=${PARENT_EXECUTION_ID}`)
      );
    });

    it('does not throw', async () => {
      internalResumeWorkflowExecution.mockRejectedValue(new Error('boom'));

      await expect(
        resumeSyncParentIfNeeded({
          childExecution: createChildExecution(),
          spaceId: SPACE_ID,
          internalResumeWorkflowExecution,
          logger,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('when the parent should not be resumed', () => {
    it('does nothing when the child is not in a terminal status', async () => {
      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution({ status: ExecutionStatus.RUNNING }),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('does nothing for an async parent invocation', async () => {
      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution({
          context: {
            parentWorkflowInvocation: 'async',
            parentWorkflowExecutionId: PARENT_EXECUTION_ID,
          },
        } as Partial<EsWorkflowExecution>),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('does nothing when the execution has no parent', async () => {
      await resumeSyncParentIfNeeded({
        childExecution: createChildExecution({ context: {} } as Partial<EsWorkflowExecution>),
        spaceId: SPACE_ID,
        internalResumeWorkflowExecution,
        logger,
      });

      expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it('does nothing when no resume handler is wired', async () => {
      await expect(
        resumeSyncParentIfNeeded({
          childExecution: createChildExecution(),
          spaceId: SPACE_ID,
          internalResumeWorkflowExecution: undefined,
          logger,
        })
      ).resolves.toBeUndefined();
    });
  });
});
