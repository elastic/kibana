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

export const registerTaskManagerRunSoonRoute = (
  router: IRouter,
  getStartContract: () => TaskManagerStartContract | undefined
) => {
  router.post(
    {
      path: '/internal/ftr/task_manager/{taskId}/run_soon',
      security: {
        authz: {
          requiredPrivileges: ['ftrApis'],
        },
      },
      validate: {
        params: schema.object({
          taskId: schema.string(),
        }),
      },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ) => {
      const startContract = getStartContract();
      if (!startContract) {
        return res.customError({
          statusCode: 503,
          body: { message: 'Task Manager has not started yet' },
        });
      }

      const { taskId } = req.params;

      try {
        return res.ok({ body: await startContract.runSoon(taskId) });
      } catch (err) {
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );
};
