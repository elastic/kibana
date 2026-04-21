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
import {
  TaskAlreadyRunningError,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export const registerTaskManagerRunSoonRoute = (
  router: IRouter,
  getStartContract: () => TaskManagerStartContract | undefined
) => {
  router.post(
    {
      path: '/internal/task_manager/tasks/{taskId}/run_soon',
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: {
        params: schema.object({
          taskId: schema.string(),
        }),
        query: schema.object({
          force: schema.boolean({ defaultValue: false }),
        }),
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

      const { taskId } = req.params as { taskId: string };
      const { force } = req.query as { force: boolean };

      try {
        await startContract.runSoon(taskId, force);
      } catch (err) {
        if (err instanceof TaskAlreadyRunningError) {
          return res.customError({
            statusCode: 409,
            body: { message: err.message },
          });
        }
        throw err;
      }

      return res.ok({ body: { id: taskId } });
    }
  );
};
