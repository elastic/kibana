/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runV3Migration } from './run_v3_migration';
import type { CreateTargetResponse, IO } from './io';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';

const createIO = (createTarget: (sourceIndex: string) => Promise<CreateTargetResponse>): IO => ({
  init: async () => ({ type: 'started' }),
  checkSource: async () => ({
    type: 'source_found',
    sourceIndex: '.kibana_1',
  }),
  createTarget,
  markReady: async () => ({ type: 'ready' }),
});

describe('runV3Migration POC', () => {
  it('runs the four-step happy path', async () => {
    const result = await runV3Migration({
      io: createIO(async (sourceIndex) => ({
        type: 'target_created',
        targetIndex: `${sourceIndex}_v3`,
      })),
    });

    expect(result).toEqual({
      name: DONE.Name,
      retryAttempts: 3,
      retryCount: 0,
      targetIndex: '.kibana_1_v3',
      logs: [
        'v3 INIT completed',
        'v3 CHECK_SOURCE found .kibana_1',
        'v3 CREATE_TARGET created .kibana_1_v3',
        'v3 MARK_READY completed .kibana_1_v3',
      ],
    });
  });

  it('models retry as a CREATE_TARGET self-loop', async () => {
    let createTargetCalls = 0;

    const result = await runV3Migration({
      io: createIO(async (sourceIndex) => {
        createTargetCalls += 1;

        if (createTargetCalls === 1) {
          return {
            type: 'retryable_failure',
            message: 'target shard unavailable',
          };
        }

        return {
          type: 'target_created',
          targetIndex: `${sourceIndex}_v3`,
        };
      }),
    });

    expect(createTargetCalls).toBe(2);
    expect(result.name).toBe(DONE.Name);
    expect(result.logs).toContain('v3 CREATE_TARGET retrying: target shard unavailable');
    expect(result.logs).toContain('v3 CREATE_TARGET created .kibana_1_v3');
  });

  it('fails after exhausting CREATE_TARGET retries', async () => {
    const result = await runV3Migration({
      retryAttempts: 1,
      io: createIO(async () => ({
        type: 'retryable_failure',
        message: 'target shard unavailable',
      })),
    });

    expect(result).toEqual({
      name: FATAL.Name,
      retryAttempts: 1,
      retryCount: 1,
      reason: 'target shard unavailable',
      logs: [
        'v3 INIT completed',
        'v3 CHECK_SOURCE found .kibana_1',
        'v3 CREATE_TARGET retrying: target shard unavailable',
        'v3 CREATE_TARGET exhausted retries: target shard unavailable',
      ],
    });
  });
});
