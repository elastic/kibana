import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import {
  ExecutionStatus,
  WorkflowExecution,
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

    return {};
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');

    const executeWorkflow = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, any>
    ) => {
      const workflowRunId = context['workflowRunId'];
      const workflowCreatedAt = new Date();
      const workflowStartedAt = new Date();
      await this.esClient.index({
        index: '.workflow-executions',
        id: workflowRunId,
        refresh: true,
        document: {
          id: workflowRunId,
          triggers: workflow.triggers,
          steps: workflow.steps,
          status: ExecutionStatus.RUNNING,
          createdAt: workflowCreatedAt,
          startedAt: workflowStartedAt,
        } as WorkflowExecution,
      });

      const stepRunner = new StepRunner(
        new ConnectorExecutor(
          context.connectorCredentials,
          await plugins.actions.getUnsecuredActionsClient()
        ),
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
          index: '.workflow-step-executions',
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
          index: '.workflow-step-executions',
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

      await this.esClient.update({
        index: '.workflow-executions',
        id: workflowRunId,
        refresh: true,
        doc: {
          status: ExecutionStatus.COMPLETED,
          finishedAt: new Date(),
          duration: new Date().getTime() - workflowStartedAt.getTime(),
        } as WorkflowExecution,
      });
    };

    return {
      executeWorkflow,
    };
  }

  public stop() {}
}
