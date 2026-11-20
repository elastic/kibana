/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { registerKbnClientSoRoutes } from './kbn_client_so';

/**
 * Registers FTR APIs only when Task Manager is available. Task Manager routes are
 * loaded lazily so `@kbn/task-manager-plugin` is not required when the package is omitted.
 */
export const registerRoutes = async (
  router: IRouter,
  getTaskManager: () => TaskManagerStartContract | undefined
): Promise<void> => {
  registerKbnClientSoRoutes(router);
  const { registerTaskManagerRoutes } = await import('./task_manager');
  registerTaskManagerRoutes(router, getTaskManager);
};
