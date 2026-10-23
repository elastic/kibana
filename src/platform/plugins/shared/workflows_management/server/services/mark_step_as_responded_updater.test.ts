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

  it('writes hitl audit fields and nulls token fields so a doc merge removes them', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default');

    expect(
      updater({
        spaceId: 'default',
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
    const updater = createMarkStepAsRespondedUpdater(audit, 'default');
    expect(updater({ spaceId: 'other', status: ExecutionStatus.WAITING_FOR_INPUT })).toBe('noop');
  });

  it('no-ops when finishedAt is set', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default');
    expect(
      updater({
        spaceId: 'default',
        finishedAt: '2026-04-29T10:00:00.000Z',
        status: ExecutionStatus.WAITING_FOR_INPUT,
      })
    ).toBe('noop');
  });

  it('no-ops when status is terminal', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default');
    expect(
      updater({ spaceId: 'default', status: ExecutionStatus.COMPLETED, finishedAt: undefined })
    ).toBe('noop');
  });

  it('no-ops when hitl.respondedAt is already set', () => {
    const updater = createMarkStepAsRespondedUpdater(audit, 'default');
    expect(
      updater({
        spaceId: 'default',
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
    ).toEqual({ hash: 'hash', expiresAt });
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
  const strippedToken = { hash: 'hash', expiresAt: '2099-01-01T00:00:00.000Z' };
  // The step as the claim left it: audit fields written and token fields nulled.
  const claimedStep: MarkStepAsRespondedCurrent = {
    spaceId: 'default',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    hitl: { respondedBy: 'alice', respondedAt: '2026-04-29T10:00:00.000Z', channel: 'inbox' },
    input: {
      foo: 'bar',
      [HITL_TOKEN_HASH_INPUT_FIELD]: null,
      [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
    },
  };

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
