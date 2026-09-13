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
import { createMarkStepAsRespondedUpdater } from './mark_step_as_responded_updater';

describe('createMarkStepAsRespondedUpdater', () => {
  const audit = {
    respondedBy: 'alice',
    respondedAt: '2026-04-29T10:00:00.000Z',
    channel: 'inbox',
  };

  it('writes hitl audit fields and strips token fields from input', () => {
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
      input: { foo: 'bar' },
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
