import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type {
  WorkflowsExamplePluginSetup,
  WorkflowsExamplePluginSetupDeps,
  WorkflowsExamplePluginStart,
  WorkflowsExamplePluginStartDeps,
} from './types';
import { defineRoutes } from './routes';

export class WorkflowsExamplePlugin
  implements Plugin<WorkflowsExamplePluginSetup, WorkflowsExamplePluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<WorkflowsExamplePluginStartDeps, WorkflowsExamplePluginStartDeps>,
    deps: WorkflowsExamplePluginSetupDeps
  ) {
    // Register server side APIs
    defineRoutes(core);
    return {};
  }

  public start(core: CoreStart, plugins: WorkflowsExamplePluginStartDeps) {
    this.logger.debug('workflows: Start');

    this.logger.debug('workflows: Started');

    return {};
  }

  public stop() {}
}
