/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { ExecutionStatus, WorkflowExecutionEngineModel } from '@kbn/workflows';

import { Client } from '@elastic/elasticsearch';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { ConnectorExecutor } from './connector_executor';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTION_LOGS_INDEX,
} from '../common';
import { StepFactory } from './step/step_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';

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
      const workflowRunId = context.workflowRunId;
      const workflowCreatedAt = new Date();
      const workflowStartedAt = new Date();
      let workflowExecutionStatus: ExecutionStatus = ExecutionStatus.RUNNING;
      let workflowExecutionError: string | null = null;
      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      await this.esClient.index({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: workflowRunId,
        refresh: true,
        document: {
          id: workflowRunId,
          workflowId: workflow.id,
          workflowDefinition: workflow.definition,
          status: workflowExecutionStatus,
          createdAt: workflowCreatedAt.toISOString(),
          startedAt: workflowStartedAt.toISOString(),
          error: null,
          createdBy: context.createdBy || '', // TODO: set if available
          lastUpdatedAt: workflowCreatedAt.toISOString(),
          lastUpdatedBy: context.createdBy || '', // TODO: set if available
          finishedAt: null,
          duration: null,
          tags: [],
          description: '',
          triggeredBy, // <-- new field for scheduled workflows
        } as any, // EsWorkflowExecution (add triggeredBy to type if needed)
      });

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
        // Enable workflow event logging
        logger: this.logger,
        workflowEventLoggerIndex: WORKFLOWS_EXECUTION_LOGS_INDEX,
        esClient: this.esClient,
      });

      // Log workflow execution start
      contextManager.logWorkflowStart();

      try {
        for (const currentStep of workflow.definition.workflow.steps) {
          const step = new StepFactory().create(
            currentStep as any,
            contextManager,
            connectorExecutor
          );
          const workflowExecutionId = `${workflowRunId}-${currentStep.name}`;
          const stepStartedAt = new Date();

          await this.esClient.index({
            index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            id: workflowExecutionId,
            refresh: true,
            document: {
              id: workflowExecutionId,
              workflowId: workflow.id,
              workflowRunId,
              stepId: currentStep.name,
              status: ExecutionStatus.RUNNING,
              startedAt: stepStartedAt.toISOString(),
              completedAt: null,
              executionTimeMs: null,
              error: null,
              output: null,
            } as any, // EsWorkflowStepExecution
          });

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
              completedAt: completedAt.toISOString(),
              executionTimeMs,
              error: stepResult.error,
              output: stepResult.output,
            } as any, // EsWorkflowStepExecution
          });

          if (stepStatus === ExecutionStatus.FAILED) {
            throw new Error(
              `Step "${currentStep.name}" failed with error: ${stepResult.error || 'Unknown error'}`
            );
          }
        }

        workflowExecutionStatus = ExecutionStatus.COMPLETED;
        // Log workflow success
        contextManager.logWorkflowComplete(true);
      } catch (error) {
        workflowExecutionStatus = ExecutionStatus.FAILED;
        workflowExecutionError = error instanceof Error ? error.message : String(error);
        // Log workflow failure
        // contextManager.logError('Workflow execution failed', error as Error, {
        //   event: { action: 'workflow-failed', outcome: 'failure' },
        // });
        contextManager.logWorkflowComplete(false);
      } finally {
        await this.esClient.update({
          index: WORKFLOWS_EXECUTIONS_INDEX,
          id: workflowRunId,
          refresh: true,
          doc: {
            status: workflowExecutionStatus,
            error: workflowExecutionError,
            finishedAt: new Date().toISOString(),
            duration: new Date().getTime() - workflowStartedAt.getTime(),
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: context.createdBy || '', // TODO: set if available
          } as any, // EsWorkflowExecution
        });
      }
    };

    return {
      executeWorkflow,
    };
  }

  public stop() {}
}
