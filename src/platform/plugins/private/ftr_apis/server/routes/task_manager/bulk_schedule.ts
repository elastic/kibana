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
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { TaskToSchedule } from './schedule';
import { taskToScheduleSchema } from './schedule';

const bulkScheduleBodySchema = schema.object({
  tasks: schema.arrayOf(taskToScheduleSchema, { minSize: 1, maxSize: 100 }),
});

/**
 * FTR/Scout-only wrapper around Task Manager `bulkSchedule` (behind `ftrApis`). The request is
 * always passed through so API keys are granted for the tasks, which is what the tests exercising
 * the grant-then-fail cleanup paths need.
 */
export const registerTaskManagerBulkScheduleRoute = (
  router: IRouter,
  getStartContract: () => TaskManagerStartContract | undefined
) => {
  router.post(
    {
      path: '/internal/task_manager/bulk_schedule',
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: {
        body: bulkScheduleBodySchema,
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

      const { tasks } = req.body as { tasks: TaskToSchedule[] };

      return res.ok({ body: await startContract.bulkSchedule(tasks, { request: req }) });
    }
  );
};
