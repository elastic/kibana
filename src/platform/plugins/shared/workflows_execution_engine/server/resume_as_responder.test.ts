/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServerMock, securityServiceMock } from '@kbn/core/server/mocks';
import { UNKNOWN_EXECUTION_IDENTITY } from './lib/execution_identity';
import {
  getResumeAsRecord,
  getWorkflowResponder,
  resolveWorkflowResponder,
  RESUME_AS_CONTEXT_KEY,
  ResumeAsResponderError,
  withWorkflowResponder,
} from './resume_as_responder';

describe('resume as responder', () => {
  const core = { ...coreMock.createStart(), security: securityServiceMock.createStart() };
  const request = httpServerMock.createKibanaRequest();
  const answer = {
    pendingInteractiveResume: true,
    resumeInput: { approved: true },
    resumedBy: 'u_analyst',
  };
  const requested = { [RESUME_AS_CONTEXT_KEY]: { stepExecutionId: 'step-1', responder: null } };
  const active = {
    [RESUME_AS_CONTEXT_KEY]: { stepExecutionId: 'step-1', responder: 'u_analyst' },
  };
  const runAs = (user: { profile_uid?: string; username: string }) =>
    core.security.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser(user)
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveWorkflowResponder', () => {
    it('should return the responder when the run is the person who answered', async () => {
      runAs({ profile_uid: 'u_analyst', username: 'analyst' });

      await expect(
        resolveWorkflowResponder(core, { context: { ...requested, ...answer } }, request)
      ).resolves.toBe('u_analyst');
    });

    it('should match a responder without a user profile by username', async () => {
      runAs({ profile_uid: undefined, username: 'api-key-owner' });

      await expect(
        resolveWorkflowResponder(
          core,
          { context: { ...requested, ...answer, resumedBy: 'api-key-owner' } },
          request
        )
      ).resolves.toBe('api-key-owner');
    });

    it('should return nothing when the run is someone else, so the waiting step refuses the answer', async () => {
      runAs({ profile_uid: 'u_previous_approver', username: 'previous' });

      await expect(
        resolveWorkflowResponder(core, { context: { ...requested, ...answer } }, request)
      ).resolves.toBeUndefined();
    });

    it.each([
      ['answered through an external link', { pendingInteractiveResume: false }],
      ['answered by an unknown identity', { resumedBy: UNKNOWN_EXECUTION_IDENTITY }],
      ['not answered yet', { resumeInput: null }],
    ])('should return nothing when the wait was %s', async (_, override) => {
      runAs({ profile_uid: 'u_analyst', username: 'analyst' });

      await expect(
        resolveWorkflowResponder(
          core,
          { context: { ...requested, ...answer, ...override } },
          request
        )
      ).resolves.toBeUndefined();
      expect(core.security.authc.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should return nothing when the waiting step did not ask to resume as the responder', async () => {
      runAs({ profile_uid: 'u_analyst', username: 'analyst' });

      await expect(
        resolveWorkflowResponder(core, { context: answer }, request)
      ).resolves.toBeUndefined();
      expect(core.security.authc.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should keep the responder of an earlier answer while the run is still that person', async () => {
      runAs({ profile_uid: 'u_analyst', username: 'analyst' });

      await expect(resolveWorkflowResponder(core, { context: active }, request)).resolves.toBe(
        'u_analyst'
      );
    });

    it('should throw when the execution runs as a responder and the run is someone else', async () => {
      runAs({ profile_uid: 'u_original_caller', username: 'caller' });

      await expect(resolveWorkflowResponder(core, { context: active }, request)).rejects.toThrow(
        ResumeAsResponderError
      );
    });

    it('should look the run identity up again when it cannot be resolved at first', async () => {
      core.security.authc.getCurrentUser.mockReturnValueOnce(null).mockReturnValue(
        securityServiceMock.createMockAuthenticatedUser({
          profile_uid: 'u_analyst',
          username: 'analyst',
        })
      );

      await expect(
        resolveWorkflowResponder(core, { context: { ...requested, ...answer } }, request)
      ).resolves.toBe('u_analyst');
      expect(core.security.authc.getCurrentUser).toHaveBeenCalledTimes(2);
    });

    it('should return nothing when the run identity cannot be resolved, so the waiting step refuses the answer', async () => {
      core.security.authc.getCurrentUser.mockReturnValue(null);

      await expect(
        resolveWorkflowResponder(core, { context: { ...requested, ...answer } }, request)
      ).resolves.toBeUndefined();
      expect(core.security.authc.getCurrentUser).toHaveBeenCalledTimes(3);
    });

    it('should throw when the execution runs as a responder and the run identity cannot be resolved', async () => {
      core.security.authc.getCurrentUser.mockReturnValue(null);

      await expect(resolveWorkflowResponder(core, { context: active }, request)).rejects.toThrow(
        'the identity of this run could not be confirmed'
      );
    });
  });

  describe('getResumeAsRecord', () => {
    it('should ignore a cleared or malformed record', () => {
      expect(getResumeAsRecord(undefined)).toBeUndefined();
      expect(getResumeAsRecord({ [RESUME_AS_CONTEXT_KEY]: null })).toBeUndefined();
      expect(
        getResumeAsRecord({ [RESUME_AS_CONTEXT_KEY]: { stepExecutionId: 'step-1' } })
      ).toBeUndefined();
    });
  });

  describe('withWorkflowResponder', () => {
    it('should mark the request as the responder only while the run lasts', async () => {
      await withWorkflowResponder(request, 'u_analyst', async () => {
        expect(getWorkflowResponder(request)).toBe('u_analyst');
      });

      expect(getWorkflowResponder(request)).toBeUndefined();
    });
  });
});
