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


import { ConnectorExecutor } from './connector-executor';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../common';
import { StepFactory } from './step/step-factory';
import { WorkflowContextManager } from './workflow-context-manager/workflow-context-manager';

export class WorkflowsExecutionEnginePlugin
  implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart> {
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
      const workflowRunId = context.workflowRunId;
      const workflowCreatedAt = new Date();
      const workflowStartedAt = new Date();
      let workflowExecutionStatus: ExecutionStatus = ExecutionStatus.RUNNING;
      let workflowExecutionError: string | null = null;
      await this.esClient.index({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: workflowRunId,
        refresh: true,
        document: {
          workflowId: workflow.id,
          id: workflowRunId,
          triggers: workflow.triggers,
          steps: workflow.steps,
          status: workflowExecutionStatus,
          createdAt: workflowCreatedAt,
          startedAt: workflowStartedAt,
        } as WorkflowExecution,
      });

      try {
        const connectorExecutor = new ConnectorExecutor(
          context.connectorCredentials,
          await plugins.actions.getUnsecuredActionsClient()
        );

        const contextManager = new WorkflowContextManager({
          workflowRunId,
          workflow: workflow as any,
          stepResults: {},
          event: context.event,
          esApiKey: context.esApiKey,
        });

        for (const currentStep of workflow.steps) {
          const step = StepFactory.create(currentStep, contextManager, connectorExecutor);
          const workflowExecutionId = `${workflowRunId}-${currentStep.id}`;
          const stepStartedAt = new Date();

          await this.esClient.index({
            index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
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

          // const stepResult = await stepRunner.runStep(currentStep, stepsContext);
          const stepResult = await step.run();

          let stepStatus: ExecutionStatus;

          if (stepResult.error) {
            stepStatus = ExecutionStatus.FAILED;
          } else {
            stepStatus = ExecutionStatus.COMPLETED;
          }

          const completedAt = new Date();
          const executionTimeMs = completedAt.getTime() - stepStartedAt.getTime();

          await this.esClient.update({
            index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            id: workflowExecutionId,
            refresh: true,
            doc: {
              status: stepStatus,
              completedAt,
              executionTimeMs, // Placeholder, calculate if needed
              error: stepResult.error,
              output: stepResult.output,
            } as WorkflowStepExecution,
          });

          if (stepStatus === ExecutionStatus.FAILED) {
            throw new Error(
              `Step "${currentStep.id}" failed with error: ${stepResult.error || 'Unknown error'}`
            );
          }
        }

        workflowExecutionStatus = ExecutionStatus.COMPLETED;
      } catch (error) {
        workflowExecutionStatus = ExecutionStatus.FAILED;
        workflowExecutionError = error instanceof Error ? error.message : String(error);
      } finally {
        await this.esClient.update({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          id: workflowRunId,
          refresh: true,
          doc: {
            status: workflowExecutionStatus,
            error: workflowExecutionError,
            finishedAt: new Date(),
            duration: new Date().getTime() - workflowStartedAt.getTime(),
          } as WorkflowExecution,
        });
      }
    };

    return {
      executeWorkflow,
    };
  }

  public stop() { }
}
