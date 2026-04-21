/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { IntervalSchedule, RruleSchedule } from '@kbn/response-ops-scheduling-types';
import type { InstanceTaskCost, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

const scheduleBodySchema = schema.object({
  task: schema.object({
    taskType: schema.string({ minLength: 1, maxLength: 200 }),
    id: schema.maybe(schema.string({ maxLength: 200 })),
    enabled: schema.boolean({ defaultValue: true }),
    params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    state: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    scope: schema.maybe(
      schema.arrayOf(schema.string({ minLength: 1, maxLength: 200 }), { maxSize: 10 })
    ),
    schedule: schema.maybe(
      schema.oneOf([
        schema.object({
          interval: schema.string(),
        }),
        schema.object({
          rrule: schema.object({
            dtstart: schema.maybe(schema.string()),
            freq: schema.number({ min: 0, max: 3 }),
            interval: schema.number({ min: 1 }),
            tzid: schema.string({ defaultValue: 'UTC' }),
            byhour: schema.maybe(
              schema.arrayOf(schema.number({ min: 0, max: 23 }), { maxSize: 24 })
            ),
            byminute: schema.maybe(
              schema.arrayOf(schema.number({ min: 0, max: 59 }), { maxSize: 60 })
            ),
            byweekday: schema.maybe(
              schema.arrayOf(schema.number({ min: 1, max: 7 }), { maxSize: 7 })
            ),
            bymonthday: schema.maybe(
              schema.arrayOf(schema.number({ min: 1, max: 31 }), { maxSize: 31 })
            ),
          }),
        }),
      ])
    ),
    timeoutOverride: schema.maybe(schema.string({ maxLength: 50 })),
    cost: schema.maybe(
      schema.oneOf([schema.literal('tiny'), schema.literal('normal'), schema.literal('extralarge')])
    ),
  }),
  /**
   * When true, Task Manager schedules without the HTTP request, so no API keys are granted from the caller.
   * Intended for FTR/Scout only (this route is behind `ftrApis`). Omitted or false preserves existing callers' body shape.
   */
  skipRequestForScheduling: schema.maybe(schema.boolean()),
  /**
   * When true with a normal schedule (request present), grant only the Elasticsearch API key (no UIAM).
   * FTR/Scout only (`ftrApis`).
   */
  onEsKey: schema.maybe(schema.boolean()),
});

export const registerTaskManagerScheduleRoute = (
  router: IRouter,
  getStartContract: () => TaskManagerStartContract | undefined
) => {
  router.post(
    {
      path: '/internal/task_manager/schedule',
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: {
        body: scheduleBodySchema,
      },
    },
    async (_context: RequestHandlerContext, req: KibanaRequest, res: KibanaResponseFactory) => {
      const startContract = getStartContract();
      if (!startContract) {
        return res.customError({
          statusCode: 503,
          body: { message: 'Task Manager has not started yet' },
        });
      }

      const { task, skipRequestForScheduling, onEsKey } = req.body as {
        task: {
          taskType: string;
          id?: string;
          enabled?: boolean;
          params: Record<string, unknown>;
          state: Record<string, unknown>;
          scope?: string[];
          schedule?: IntervalSchedule | RruleSchedule;
          timeoutOverride?: string;
          cost?: InstanceTaskCost;
        };
        skipRequestForScheduling?: boolean;
        onEsKey?: boolean;
      };

      const taskResult =
        skipRequestForScheduling === true
          ? await startContract.schedule(task)
          : await startContract.schedule(task, {
              request: req,
              ...(onEsKey === true ? { onEsKey: true } : {}),
            });

      return res.ok({ body: taskResult });
    }
  );
};
