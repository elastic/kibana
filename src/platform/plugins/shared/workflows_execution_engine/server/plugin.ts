/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { EsWorkflowExecution, ExecutionStatus, WorkflowExecutionEngineModel } from '@kbn/workflows';

import { graphlib } from '@dagrejs/dagre';
import { Client } from '@elastic/elasticsearch';
import type { WorkflowsExecutionEngineConfig } from './config';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { WORKFLOWS_EXECUTION_LOGS_INDEX } from '../common';
import { ConnectorExecutor } from './connector_executor';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { StepFactory } from './step/step_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';

export class WorkflowsExecutionEnginePlugin
  implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart>
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;
  private esClient: Client = new Client({
    node: 'http://localhost:9200', // or your ES URL
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
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

      const connectorExecutor = new ConnectorExecutor(
        context.connectorCredentials,
        await plugins.actions.getUnsecuredActionsClient()
      );

      const workflowLogger = new WorkflowEventLogger(
        this.esClient,
        this.logger,
        WORKFLOWS_EXECUTION_LOGS_INDEX,
        {
          workflowId: workflow.id,
          workflowName: workflow.name,
          executionId: workflowRunId,
        },
        {
          enableConsoleLogging: this.config.logging.console,
        }
      );

      // Create workflow runtime first (simpler, fewer dependencies)
      const workflowRuntime = new WorkflowExecutionRuntimeManager({
        workflowExecution: workflowExecution as EsWorkflowExecution,
        workflowExecutionRepository,
        stepExecutionRepository,
        workflowExecutionGraph,
        workflowLogger,
      });

      const contextManager = new WorkflowContextManager({
        workflowRunId,
        workflow: workflow.definition,
        event: context.event,
        logger: this.logger,
        workflowEventLoggerIndex: WORKFLOWS_EXECUTION_LOGS_INDEX,
        esClient: this.esClient,
        workflowExecutionGraph,
        workflowExecutionRuntime: workflowRuntime,
      });

      // Log workflow execution start
      await workflowRuntime.start();

      do {
        const currentNode = workflowRuntime.getCurrentStep();

        const step = new StepFactory().create(
          currentNode as any,
          contextManager,
          connectorExecutor,
          workflowRuntime,
          workflowLogger
        );

        try {
          await step.run();
        } catch (error) {
          // If an unhandled error occurs in a step, the workflow execution is terminated
          workflowLogger.logError(
            `Error executing step ${currentNode.id} (${currentNode.name}): ${error.message}`
          );
          await workflowRuntime.setStepResult(currentNode.id, {
            output: null,
            error: String(error),
          });
          await workflowRuntime.finishStep(currentNode.id);
          await workflowRuntime.fail(error);
          break;
        }
      } while (workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING);
    };

    return {
      executeWorkflow,
    };
  }

  public stop() {}
}
