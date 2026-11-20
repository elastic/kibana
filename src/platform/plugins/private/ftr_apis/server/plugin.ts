/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { registerRoutes } from './routes';
import type { ConfigType } from './config';

interface FtrApisSetupDeps {
  taskManager?: TaskManagerSetupContract;
}

interface FtrApisStartDeps {
  taskManager?: TaskManagerStartContract;
}

export class FtrApisPlugin implements Plugin<void, void, FtrApisSetupDeps, FtrApisStartDeps> {
  private readonly config: ConfigType;
  private taskManagerStart?: TaskManagerStartContract;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
  }

  public async setup({ http }: CoreSetup, { taskManager }: FtrApisSetupDeps) {
    // Task Manager is a required dependency of Security. Without it, privilege checks on the
    // FTR Saved Objects routes are not enforced — keep those routes unregistered (same as when
    // ftrApis itself used to be disabled by a required taskManager edge).
    if (this.config.disableApis || !taskManager) {
      return;
    }

    const router = http.createRouter();
    await registerRoutes(router, () => this.taskManagerStart);
  }

  public start(_core: CoreStart, { taskManager }: FtrApisStartDeps) {
    this.taskManagerStart = taskManager;
  }
}
