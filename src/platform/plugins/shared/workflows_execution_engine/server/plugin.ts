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
import { EsWorkflowExecution, ExecutionStatus, WorkflowExecutionEngineModel } from '@kbn/workflows';

import { Client } from '@elastic/elasticsearch';
import { graphlib } from '@dagrejs/dagre';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { ConnectorExecutor } from './connector_executor';
import { WORKFLOWS_EXECUTION_LOGS_INDEX } from '../common';
import { StepFactory } from './step/step_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { StepExecutionRepository } from './repositories/step_execution_repository';

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
      const workflowExecutionRepository = new WorkflowExecutionRepository(this.esClient);
      const stepExecutionRepository = new StepExecutionRepository(this.esClient);

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution = {
        id: workflowRunId,
        workflowId: workflow.id,
        workflowDefinition: workflow.definition,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: context.createdBy || '', // TODO: set if available
        lastUpdatedAt: workflowCreatedAt.toISOString(),
        lastUpdatedBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      } as Partial<EsWorkflowExecution>; // EsWorkflowExecution (add triggeredBy to type if needed)
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);
      const workflowExecutionGraph = graphlib.json.read(workflow.executionGraph);
      const workflowRuntime = new WorkflowExecutionRuntimeManager({
        workflowExecution: workflowExecution as EsWorkflowExecution,
        workflowExecutionRepository,
        stepExecutionRepository,
        workflowExecutionGraph,
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
        workflowExecutionGraph,
        workflowState: workflowRuntime,
      });

      // Log workflow execution start
      await contextManager.logWorkflowStart();

      await workflowRuntime.start();

      try {
        do {
          const currentNode = workflowRuntime.getCurrentStep();

          const step = new StepFactory().create(
            currentNode as any,
            contextManager,
            connectorExecutor,
            workflowRuntime
          );

          await step.run();
        } while (workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING);

        contextManager.logWorkflowComplete(true);
      } catch (error) {
        await workflowRuntime.fail(error);
        contextManager.logWorkflowComplete(false);
      }
    };

    return {
      executeWorkflow,
    };
  }

  public stop() {}
}
