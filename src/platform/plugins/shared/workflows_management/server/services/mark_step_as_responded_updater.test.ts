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
