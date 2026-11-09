/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import {
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import type { WorkflowsService } from './workflows_management_service';
import type { HitlStepClaim } from '../services/mark_step_as_responded_updater';

/**
 * Whether a failed engine resume left nothing pending, so the step claim can be released.
 * An execution that is no longer waiting for input keeps the claim, so its step does not come back
 * as answerable.
 */
const isResumeNotPendingError = (error: unknown): boolean =>
  error instanceof WorkflowExecutionNotFoundError || error instanceof WorkflowResumeNotAppliedError;

/** Unwraps the engine's original resume error so callers keep their error-to-status mapping. */
const unwrapResumeError = (error: unknown): unknown =>
  error instanceof WorkflowResumeNotAppliedError ? error.cause ?? error : error;

interface ReleaseHitlClaimParams {
  workflowsService: Pick<WorkflowsService, 'releaseHitlStepClaim'>;
  logger: Logger;
  executionId: string;
  stepExecutionId: string;
  claim: HitlStepClaim;
  spaceId: string;
}

/** Resolves to whether the claim was released, never throwing. */
const releaseClaimAfterFailedResume = async ({
  workflowsService,
  logger,
  executionId,
  stepExecutionId,
  claim,
  spaceId,
}: ReleaseHitlClaimParams): Promise<boolean> => {
  try {
    const released = await workflowsService.releaseHitlStepClaim(stepExecutionId, claim, spaceId);
    if (!released) {
      logger.warn(
        `Did not release the claim on step execution ${stepExecutionId} of workflow execution ${executionId}: the step is no longer waiting for input or the claim changed`
      );
    }
    return released;
  } catch (error) {
    logger.warn(
      `Failed to release the claim on step execution ${stepExecutionId} of workflow execution ${executionId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};

export interface WithHitlClaimParams extends ReleaseHitlClaimParams {
  /** Called with whether the claim was released, when the failed resume left nothing pending. */
  onRelease?: (released: boolean) => void;
}

/**
 * Runs the resume of a claimed step, releasing the claim when the resume fails and leaves nothing
 * pending. The engine's original error is rethrown either way.
 */
export const withHitlClaim = async <T>(
  { onRelease, ...params }: WithHitlClaimParams,
  resume: () => Promise<T>
): Promise<T> => {
  try {
    return await resume();
  } catch (error) {
    if (isResumeNotPendingError(error)) {
      const released = await releaseClaimAfterFailedResume(params);
      onRelease?.(released);
    }
    throw unwrapResumeError(error);
  }
};
