import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { WorkflowsPluginSetup, WorkflowsPluginStart } from './types';
import { defineRoutes } from './routes';
import { WorkflowsManagementApi } from './api';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('Workflows: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {
      management: WorkflowsManagementApi,
    };
  }

  public start(core: CoreStart) {
    this.logger.debug('Workflows: Started');
    return {};
  }

  public stop() {}
}
