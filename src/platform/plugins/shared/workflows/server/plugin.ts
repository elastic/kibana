import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { Client } from '@elastic/elasticsearch';
import { v4 as generateUuid } from 'uuid';

import type { WorkflowsPluginSetup, WorkflowsPluginSetupDeps, WorkflowsPluginStart } from './types';
import { defineRoutes } from './routes';
import { WorkflowsManagementApi } from './api';
import {
  providers,
  Workflow,
  WorkflowRunStatus,
  workflows,
  WorkflowStepExecution,
} from './from-poc';
import { StepRunner } from './step-runner/step-runner';
import { TemplatingEngine } from './templating-engine';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;
  private esClient: Client = new Client({
    node: 'http://localhost:9200', // or your ES URL
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: WorkflowsPluginSetupDeps) {
    this.logger.debug('Workflows: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    this.logger.debug('workflows: Setup');
    async function getTaskManager(): Promise<TaskManagerStartContract> {
      const { taskManager } = await core.plugins.onStart<{ taskManager: TaskManagerStartContract }>(
        'taskManager'
      );
      if (!taskManager.found) {
        throw new Error('Task Manager plugin is not available');
      }

      return taskManager.contract;
    }

    const scheduleStep = async (
      workflowRunId: string,
      workflow: Workflow,
      stepsStack: string[],
      context: Record<string, any>
    ) => {
      const currentStepId = stepsStack.pop() as string;
      const currentStep = workflow.steps[currentStepId];
      const taskManager = await getTaskManager();
      const stepRunner = new StepRunner(providers, new TemplatingEngine());
      const workflowExecutionId = `${workflowRunId}-${currentStepId}`;
      const startedAt = new Date();

      await this.esClient.index({
        index: 'workflow-step-executions',
        id: workflowExecutionId,
        refresh: true,
        document: {
          id: workflowExecutionId,
          workflowId: workflow.id,
          workflowRunId,
          stepId: currentStepId,
          status: WorkflowRunStatus.RUNNING,
          startedAt,
        } as WorkflowStepExecution,
      });

      const stepResult = await stepRunner.runStep(currentStep, context);

      let status: WorkflowRunStatus;
      if (stepResult.error) {
        status = WorkflowRunStatus.FAILED;
      } else {
        status = WorkflowRunStatus.COMPLETED;
      }

      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - startedAt.getTime();

      await this.esClient.update({
        index: 'workflow-step-executions',
        id: workflowExecutionId,
        refresh: true,
        doc: {
          status,
          completedAt,
          executionTimeMs, // Placeholder, calculate if needed
          error: stepResult.error,
          output: stepResult.output,
        } as WorkflowStepExecution,
      });

      if (stepResult.output) {
        context.stepOutputs = context.stepOutputs || {};
        context.stepOutputs[currentStepId] = stepResult.output;
      }

      if (stepsStack.length > 0) {
        taskManager.schedule({
          taskType: 'execute-step',
          params: {
            workflowRunId,
            workflow,
            context,
            stepsStack,
          },
          state: {},
        });
      }
    };

    plugins.taskManager.registerTaskDefinitions({
      ['workflow-event']: {
        title: 'Receive workflow events',
        timeout: '2m',
        stateSchemaByVersion: {},
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const { eventType, rawEvent } = taskInstance.params;
            this.logger.debug(`Received workflow event: ${eventType}`, rawEvent);
            const currentTriggerWorkflows = workflows[eventType];

            currentTriggerWorkflows?.forEach((workflow) => {
              const workflowRunId = generateUuid();
              this.logger.debug(
                `Scheduling workflow "${workflow.name}" with run ID: ${workflowRunId}`
              );
              const stepIdsStack = Object.keys(workflow.steps).reverse();
              scheduleStep(workflowRunId, workflow, stepIdsStack, {
                event: rawEvent,
              });
            });

            return {
              state: {},
            };
          },
          cancel: async () => {},
        }),
      },
      ['execute-step']: {
        title: 'Run workflow step',
        timeout: '2m',
        stateSchemaByVersion: {},
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const { workflow, context, stepsStack, workflowRunId } = taskInstance.params;

            scheduleStep(workflowRunId, workflow, stepsStack, context);

            return {
              state: {},
            };
          },
          cancel: async () => {},
        }),
      },
    });

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
