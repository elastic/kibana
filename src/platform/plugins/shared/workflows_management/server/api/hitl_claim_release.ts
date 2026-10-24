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
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import type { WorkflowsService } from './workflows_management_service';
import type { HitlStepClaim } from '../services/mark_step_as_responded_updater';

/** Whether a failed engine resume left nothing pending, so the step claim can be released. */
export const isResumeNotPendingError = (error: unknown): boolean =>
  error instanceof WorkflowExecutionNotFoundError ||
  error instanceof WorkflowExecutionInvalidStatusError ||
  error instanceof WorkflowResumeNotAppliedError;

/** Unwraps the engine's original resume error so callers keep their error-to-status mapping. */
export const unwrapResumeError = (error: unknown): unknown =>
  error instanceof WorkflowResumeNotAppliedError ? error.cause ?? error : error;

export interface ReleaseClaimAfterFailedResumeParams {
  workflowsService: Pick<WorkflowsService, 'releaseHitlStepClaim'>;
  logger: Logger;
  executionId: string;
  stepExecutionId: string;
  claim: HitlStepClaim;
  spaceId: string;
}

/**
 * Releases the step claim of a resume that was not applied, resolving to whether it was released
 * and never throwing.
 */
export const releaseClaimAfterFailedResume = async ({
  workflowsService,
  logger,
  executionId,
  stepExecutionId,
  claim,
  spaceId,
}: ReleaseClaimAfterFailedResumeParams): Promise<boolean> => {
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
