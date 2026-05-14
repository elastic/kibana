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
  poll: {
    handler: async (context) => {
      const { pollsBeforeDone } = context.input;

      if (context.attempt >= pollsBeforeDone) {
        return {
          output: {
            message: `Finished after ${context.attempt} poll invocation(s).`,
            completedAfterPolls: context.attempt,
          },
        };
      }

      context.logger.debug(`Durable poll demo: attempt ${context.attempt}/${pollsBeforeDone}`);
      return { state: { lastAttempt: context.attempt } };
    },
    policy: { strategy: 'fixed', intervalMs: 7_000 },
    ceilings: { maxAttempts: 30, maxWaitMs: 15 * 60_000 },
  },
}) as ServerStepDefinition;
