/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExecutionStatus,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
} from '@kbn/workflows';
import {
  createMarkStepAsRespondedUpdater,
  createReleaseHitlStepClaimUpdater,
  getStrippedHitlToken,
  type HitlStepClaim,
  type MarkStepAsRespondedCurrent,
} from './mark_step_as_responded_updater';

describe('createMarkStepAsRespondedUpdater', () => {
  const audit = {
    respondedBy: 'alice',
    respondedAt: '2026-04-29T10:00:00.000Z',
    channel: 'inbox',
  };

  it('nulls the token on step state and on step input', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    const expiresAt = '2099-01-01T00:00:00.000Z';

    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        state: {
          dynamicTimeout: '1h',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
        input: {
          foo: 'bar',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
      })
    ).toEqual({
      hitl: {
        respondedBy: audit.respondedBy,
        respondedAt: audit.respondedAt,
        channel: audit.channel,
      },
      state: {
        dynamicTimeout: '1h',
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      },
      input: {
        foo: 'bar',
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      },
    });
  });

  it('nulls a token stored on step state and leaves a token-free input unchanged', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');

    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        state: {
          dynamicTimeout: '1h',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2099-01-01T00:00:00.000Z',
        },
        input: { foo: 'bar' },
      })
    ).toEqual({
      hitl: {
        respondedBy: audit.respondedBy,
        respondedAt: audit.respondedAt,
        channel: audit.channel,
      },
      state: {
        dynamicTimeout: '1h',
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      },
    });
  });

  it('writes hitl audit fields and nulls token fields so a doc merge removes them', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');

    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        finishedAt: undefined,
        status: ExecutionStatus.WAITING_FOR_INPUT,
        hitl: undefined,
        input: {
          foo: 'bar',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2099-01-01T00:00:00.000Z',
        },
      })
    ).toEqual({
      hitl: {
        respondedBy: audit.respondedBy,
        respondedAt: audit.respondedAt,
        channel: audit.channel,
      },
      input: {
        foo: 'bar',
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      },
    });
  });

  it('no-ops when spaceId does not match', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'other',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      })
    ).toBe('noop');
  });

  it('no-ops when the step belongs to a different execution', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'other-run',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      })
    ).toBe('noop');
  });

  it.each(['foreach', 'if'])(
    'no-ops for a running %s container step of the same execution',
    (stepType) => {
      const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
      expect(
        updater({
          spaceId: 'default',
          workflowRunId: 'run-1',
          stepType,
          status: ExecutionStatus.RUNNING,
        })
      ).toBe('noop');
    }
  );

  it('claims a waitForApproval step', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForApproval',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      })
    ).toEqual(expect.objectContaining({ hitl: expect.objectContaining({ respondedBy: 'alice' }) }));
  });

  it('claims a step paused at a debugger breakpoint', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'console',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        state: { breakpointPaused: true, breakpointHit: true },
      })
    ).toEqual(expect.objectContaining({ hitl: expect.objectContaining({ respondedBy: 'alice' }) }));
  });

  it('no-ops when finishedAt is set', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        finishedAt: '2026-04-29T10:00:00.000Z',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      })
    ).toBe('noop');
  });

  it('no-ops when status is terminal', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        status: ExecutionStatus.COMPLETED,
        finishedAt: undefined,
      })
    ).toBe('noop');
  });

  it('no-ops when hitl.respondedAt is already set', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default', 'run-1');
    expect(
      updater({
        spaceId: 'default',
        workflowRunId: 'run-1',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        hitl: { respondedAt: '2026-04-29T09:00:00.000Z', respondedBy: 'bob' },
      })
    ).toBe('noop');
  });
});

describe('getStrippedHitlToken', () => {
  const expiresAt = '2099-01-01T00:00:00.000Z';

  it('returns the hash and expiry when both input fields are strings', () => {
    expect(
      getStrippedHitlToken({
        input: {
          foo: 'bar',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
      })
    ).toEqual({ hash: 'hash', expiresAt, source: 'input', mirroredOnInput: false });
  });

  it('returns a token stored on step state ahead of a legacy input token', () => {
    expect(
      getStrippedHitlToken({
        state: {
          dynamicTimeout: '1h',
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'state-hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
        input: {
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'input-hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
      })
    ).toEqual({ hash: 'state-hash', expiresAt, source: 'state', mirroredOnInput: true });
  });

  it('returns a state token with mirroredOnInput false when input has no token', () => {
    expect(
      getStrippedHitlToken({
        state: {
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'state-hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt,
        },
        input: { foo: 'bar' },
      })
    ).toEqual({ hash: 'state-hash', expiresAt, source: 'state', mirroredOnInput: false });
  });

  it.each([
    ['the hash is missing', { [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: expiresAt }],
    ['the expiry is missing', { [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash' }],
    [
      'the expiry is null',
      { [HITL_TOKEN_HASH_INPUT_FIELD]: 'hash', [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null },
    ],
  ])('returns undefined when %s', (_label, input) => {
    expect(getStrippedHitlToken({ input })).toBeUndefined();
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['a string', 'hash'],
    ['an array', ['hash', expiresAt]],
  ])('returns undefined when the input is %s', (_label, input) => {
    expect(getStrippedHitlToken({ input })).toBeUndefined();
  });
});

describe('createReleaseHitlStepClaimUpdater', () => {
  const claim: HitlStepClaim = {
    respondedBy: 'alice',
    respondedAt: '2026-04-29T10:00:00.000Z',
    channel: 'inbox',
  };
  const strippedToken = {
    hash: 'hash',
    expiresAt: '2099-01-01T00:00:00.000Z',
    source: 'input' as const,
    mirroredOnInput: false,
  };
  // The step as the claim left it: audit fields written and token fields nulled.
  const claimedStep: MarkStepAsRespondedCurrent = {
    spaceId: 'default',
    workflowRunId: 'run-1',
    stepType: 'waitForInput',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    hitl: { respondedBy: 'alice', respondedAt: '2026-04-29T10:00:00.000Z', channel: 'inbox' },
    input: {
      foo: 'bar',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    },
  };

  it('restores both copies when the claim removed a token mirrored on input', () => {
    const updater = createReleaseHitlStepClaimUpdater(
      { ...claim, strippedToken: { ...strippedToken, source: 'state', mirroredOnInput: true } },
      'default'
    );

    expect(
      updater({
        ...claimedStep,
        state: {
          dynamicTimeout: '1h',
          [HITL_TOKEN_HASH_INPUT_FIELD]: null,
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
        },
      })
    ).toStrictEqual({
      hitl: null,
      state: {
        dynamicTimeout: '1h',
        [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
      },
      input: {
        foo: 'bar',
        [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
      },
    });
  });

  it('restores a token that was stripped from step state', () => {
    const updater = createReleaseHitlStepClaimUpdater(
      {
        ...claim,
        strippedToken: { ...strippedToken, source: 'state', mirroredOnInput: false },
      },
      'default'
    );

    expect(
      updater({
        ...claimedStep,
        state: {
          dynamicTimeout: '1h',
          [HITL_TOKEN_HASH_INPUT_FIELD]: null,
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
        },
      })
    ).toStrictEqual({
      hitl: null,
      state: {
        dynamicTimeout: '1h',
        [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
      },
    });
  });

  it('nulls the whole hitl object so a doc merge cannot keep any claim field', () => {
    const updater = createReleaseHitlStepClaimUpdater(claim, 'default');

    expect(updater(claimedStep)).toStrictEqual({ hitl: null });
  });

  it.each([
    [
      'null',
      {
        foo: 'bar',
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      },
    ],
    ['absent', { foo: 'bar' }],
  ])('restores the stripped token when both input fields are %s', (_label, input) => {
    const updater = createReleaseHitlStepClaimUpdater({ ...claim, strippedToken }, 'default');

    expect(updater({ ...claimedStep, input })).toStrictEqual({
      hitl: null,
      input: {
        foo: 'bar',
        [HITL_TOKEN_HASH_INPUT_FIELD]: strippedToken.hash,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: strippedToken.expiresAt,
      },
    });
  });

  it.each([
    [
      'a new token was issued',
      {
        [HITL_TOKEN_HASH_INPUT_FIELD]: 'new-hash',
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2100-01-01T00:00:00.000Z',
      },
    ],
    [
      'only the hash is set',
      { [HITL_TOKEN_HASH_INPUT_FIELD]: 'new-hash', [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null },
    ],
    [
      'only the expiry is set',
      {
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2100-01-01T00:00:00.000Z',
      },
    ],
  ])('does not restore the token when %s', (_label, input) => {
    const updater = createReleaseHitlStepClaimUpdater({ ...claim, strippedToken }, 'default');

    expect(updater({ ...claimedStep, input })).toStrictEqual({ hitl: null });
  });

  it.each([
    ['missing', undefined],
    ['a string', 'foo'],
    ['an array', ['foo']],
  ])('does not restore the token when the input is %s', (_label, input) => {
    const updater = createReleaseHitlStepClaimUpdater({ ...claim, strippedToken }, 'default');

    expect(updater({ ...claimedStep, input })).toStrictEqual({ hitl: null });
  });

  it.each([
    ['the step is in another space', { spaceId: 'other' }],
    ['the step has finished', { finishedAt: '2026-04-29T10:05:00.000Z' }],
    ['the step has settled', { status: ExecutionStatus.COMPLETED }],
    ['the step no longer waits for input', { status: ExecutionStatus.RUNNING }],
    ['the claim is gone', { hitl: undefined }],
    [
      'another response time was recorded',
      { hitl: { ...claimedStep.hitl, respondedAt: '2026-04-29T10:00:01.000Z' } },
    ],
    ['another responder was recorded', { hitl: { ...claimedStep.hitl, respondedBy: 'bob' } }],
  ])('no-ops when %s', (_label, overrides) => {
    const updater = createReleaseHitlStepClaimUpdater({ ...claim, strippedToken }, 'default');

    expect(updater({ ...claimedStep, ...overrides })).toBe('noop');
  });
});
