import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import type { WorkflowsPluginSetup, WorkflowsPluginStart } from './types';
import { defineRoutes } from './routes';
import { WorkflowsManagementApi } from './api';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('Workflows Management: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {
      management: WorkflowsManagementApi,
    };
  }

  public start(core: CoreStart, plugins: { taskManager: TaskManagerStartContract }) {
    this.logger.debug('workflows: Start');

    this.logger.debug('workflows: Started');

    return {
      // async execute workflow
      pushEvent(eventType: string, eventData: Record<string, any>) {
        plugins.taskManager.schedule({
          taskType: 'workflow-event',
          params: {
            eventType,
            rawEvent: eventData,
          },
          state: {},
        });
      },
    };
  }

  public stop() {}
}
