/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import { withHitlClaim } from './hitl_claim_release';

describe('withHitlClaim', () => {
  const claim = { respondedBy: 'elastic', respondedAt: '2026-10-27T10:00:00.000Z' };
  const cause = new Error('task manager unavailable');
  let releaseHitlStepClaim: jest.Mock;

  const params = () => ({
    workflowsService: { releaseHitlStepClaim },
    logger: loggingSystemMock.createLogger(),
    executionId: 'run-1',
    stepExecutionId: 'step-exec-1',
    claim,
    spaceId: 'default',
  });

  beforeEach(() => {
    releaseHitlStepClaim = jest.fn().mockResolvedValue(true);
  });

  it('returns the resume result without releasing the claim', async () => {
    await expect(withHitlClaim(params(), async () => ({ resumedBy: 'elastic' }))).resolves.toEqual({
      resumedBy: 'elastic',
    });

    expect(releaseHitlStepClaim).not.toHaveBeenCalled();
  });

  it('releases the claim without an onRelease callback', async () => {
    await expect(
      withHitlClaim(params(), async () => {
        throw new WorkflowResumeNotAppliedError('run-1', cause);
      })
    ).rejects.toBe(cause);

    expect(releaseHitlStepClaim).toHaveBeenCalledWith('step-exec-1', claim, 'default');
  });

  it.each([true, false])('reports released: %s to onRelease', async (released) => {
    releaseHitlStepClaim.mockResolvedValue(released);
    const onRelease = jest.fn();
    const notFound = new WorkflowExecutionNotFoundError('run-1');

    await expect(
      withHitlClaim({ ...params(), onRelease }, async () => {
        throw notFound;
      })
    ).rejects.toBe(notFound);

    expect(onRelease).toHaveBeenCalledWith(released);
  });

  it.each([
    [
      'the execution is no longer waiting',
      new WorkflowExecutionInvalidStatusError('run-1', 'completed', 'waiting_for_input'),
    ],
    ['the outcome is unknown', new Error('handoff outcome unknown')],
  ])('keeps the claim when %s', async (_case, error) => {
    const onRelease = jest.fn();

    await expect(
      withHitlClaim({ ...params(), onRelease }, async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(releaseHitlStepClaim).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });
});
