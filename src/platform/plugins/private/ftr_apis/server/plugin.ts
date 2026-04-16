/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { registerRoutes } from './routes';
import type { ConfigType } from './config';

export class FtrApisPlugin
  implements Plugin<void, void, object, { taskManager: TaskManagerStartContract }>
{
  private readonly config: ConfigType;
  private taskManagerStart?: TaskManagerStartContract;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
  }

  public setup({ http }: CoreSetup) {
    const router = http.createRouter();
    if (!this.config.disableApis) {
      registerRoutes(router, () => this.taskManagerStart);
    }
  }

  public start(_core: CoreStart, { taskManager }: { taskManager: TaskManagerStartContract }) {
    this.taskManagerStart = taskManager;
  }
}
