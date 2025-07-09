import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import {
  IUnsecuredActionsClient,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import {
  ExecutionStatus,
  WorkflowExecutionEngineModel,
  WorkflowStepExecution,
} from '@kbn/workflows';

import { Client } from '@elastic/elasticsearch';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import { StepRunner } from './step-runner/step-runner';
import { TemplatingEngine } from './templating-engine';

import { ConnectorExecutor } from './connector-executor';

export class WorkflowsExecutionEnginePlugin
  implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart>
{
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

  public setup(core: CoreSetup, plugins: WorkflowsExecutionEnginePluginSetupDeps) {
    this.logger.debug('workflows-execution-engine: Setup');

    async function getActionsClient(): Promise<IUnsecuredActionsClient> {
      const { actions } = await core.plugins.onStart<{ actions: ActionsPluginStartContract }>(
        'actions'
      );
      if (!actions.found) {
        throw new Error('Task Manager plugin is not available');
      }

      return await actions.contract.getUnsecuredActionsClient();
    }

    const runStep = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, any>
    ) => {
      const workflowRunId = context['workflowRunId'];
      const stepRunner = new StepRunner(
        new ConnectorExecutor(context.connectorCredentials, await getActionsClient()),
        new TemplatingEngine()
      );

      const stepsContext: any = {
        workflowRunId,
        event: context.event,
        steps: {},
      };

      for (const currentStep of workflow.steps) {
        const workflowExecutionId = `${workflowRunId}-${currentStep.id}`;
        const stepStartedAt = new Date();

        await this.esClient.index({
          index: 'workflow-step-executions',
          id: workflowExecutionId,
          refresh: true,
          document: {
            id: workflowExecutionId,
            workflowId: workflow.id,
            workflowRunId,
            stepId: currentStep.id,
            status: ExecutionStatus.RUNNING,
            startedAt: stepStartedAt,
          } as WorkflowStepExecution,
        });

        const stepResult = await stepRunner.runStep(currentStep, stepsContext);

        stepsContext.steps[currentStep.id] = { outputs: stepResult.output };

        let status: ExecutionStatus;
        if (stepResult.error) {
          status = ExecutionStatus.FAILED;
        } else {
          status = ExecutionStatus.COMPLETED;
        }

        const completedAt = new Date();
        const executionTimeMs = completedAt.getTime() - stepStartedAt.getTime();

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
      }
    };

    plugins.taskManager.registerTaskDefinitions({
      ['workflow-event']: {
        title: 'Receive workflow events',
        timeout: '2m',
        stateSchemaByVersion: {},
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const { eventType, workflow, context } = taskInstance.params;
            this.logger.debug(`Starting workflow ${workflow.name} for event type: ${eventType}`);

            await runStep(workflow, context);

            this.logger.debug(`Workflow ${workflow.name} is finished for event type: ${eventType}`);

            return {
              state: {},
            };
          },
          cancel: async () => {},
        }),
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');
    return {};
  }

  public stop() {}
}
