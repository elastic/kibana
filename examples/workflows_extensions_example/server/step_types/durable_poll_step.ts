/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createServerStepDefinition,
  type ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import { durablePollStepCommonDefinition } from '../../common/step_types/durable_poll_step';

export const durablePollStepDefinition = createServerStepDefinition({
  ...durablePollStepCommonDefinition,
  run: async (context) => {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      state: {
        lastAttempt: 0,
        jobId: '123',
      },
    };
  },
  poll: {
    handler: async (context) => {
      const { pollsBeforeDone } = context.input;

      if (context.attempt >= pollsBeforeDone) {
        return {
          output: {
            message: `Finished after ${context.attempt} poll invocation(s).`,
            completedAfterPolls: context.attempt,
            state: context.state,
          },
        };
      }

      context.logger.debug(`Durable poll demo: attempt ${context.attempt}/${pollsBeforeDone}`);
      return {
        state: context.state
          ? {
              ...context.state,
              lastAttempt: context.attempt,
              foo: [...(context.state.foo || []), context.state.jobId],
            }
          : undefined,
      };
    },
    policy: { strategy: 'fixed', intervalMs: 2000 },
    ceilings: { maxAttempts: 5, maxWaitMs: 36 * 1000 },
  },
}) as ServerStepDefinition;
