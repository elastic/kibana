/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseStep } from '@kbn/workflows'; // Adjust path as needed
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { StepImplementation } from './step_base';
// Import schema and inferred types
import type { ConnectorExecutor } from '../connector_executor';
import type { UrlValidator } from '../lib/url_validator';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
import { AtomicStepImpl } from './atomic_step/atomic_step_impl';
import { EnterForeachNodeImpl, ExitForeachNodeImpl } from './foreach_step';
import { HttpStepImpl } from './http_step';
import {
  EnterConditionBranchNodeImpl,
  EnterIfNodeImpl,
  ExitConditionBranchNodeImpl,
  ExitIfNodeImpl,
} from './if_step';
import { EnterRetryNodeImpl, ExitRetryNodeImpl } from './retry_step';
import { WaitStepImpl } from './wait_step/wait_step';
import { ElasticsearchActionStepImpl } from './elasticsearch_action_step';
import { KibanaActionStepImpl } from './kibana_action_step';

export class StepFactory {
  constructor(
    private contextManager: WorkflowContextManager,
    private connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger, // Assuming you have a logger interface
    private workflowTaskManager: WorkflowTaskManager,
    private urlValidator: UrlValidator
  ) {}

  public create<TStep extends BaseStep>(
    step: TStep // TODO: TStep must refer to a node type, not BaseStep (IfElseNode, ForeachNode, etc.)
  ): StepImplementation {
    const stepType = (step as any).type; // Use a more type-safe way to determine step type if possible

    if (!stepType) {
      throw new Error('Step type is not defined for step: ' + JSON.stringify(step));
    }

    // Log step creation for debugging
    this.workflowLogger.logDebug(`Creating step implementation for type: ${stepType}`, {
      event: { action: 'step-creation', outcome: 'in-progress' },
      tags: ['step-factory'],
    });

    // Check if it's an internal action type
    const isElasticsearchAction = stepType && stepType.startsWith('elasticsearch.');
    const isKibanaAction = stepType && stepType.startsWith('kibana.');

    switch (stepType) {
      case 'enter-foreach':
        return new EnterForeachNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          this.workflowLogger
        );
      case 'exit-foreach':
        return new ExitForeachNodeImpl(step as any, this.workflowRuntime, this.workflowLogger);
      case 'enter-retry':
        return new EnterRetryNodeImpl(
          step as any,
          this.workflowRuntime,
          this.workflowTaskManager,
          this.workflowLogger
        );
      case 'exit-retry':
        return new ExitRetryNodeImpl(step as any, this.workflowRuntime, this.workflowLogger);
      case 'enter-if':
        return new EnterIfNodeImpl(
          step as any,
          this.workflowRuntime,
          this.contextManager,
          this.workflowLogger
        );
      case 'enter-condition-branch':
        return new EnterConditionBranchNodeImpl(this.workflowRuntime);
      case 'exit-condition-branch':
        return new ExitConditionBranchNodeImpl(step as any, this.workflowRuntime);
      case 'exit-if':
        return new ExitIfNodeImpl(step as any, this.workflowRuntime);
      case 'wait':
        return new WaitStepImpl(
          step as any,
          this.workflowRuntime,
          this.workflowLogger,
          this.workflowTaskManager
        );
      case 'atomic':
        // Check if this is an internal action (elasticsearch.* or kibana.*)
        const atomicStepType = (step as any).configuration?.type;

        if (atomicStepType && atomicStepType.startsWith('elasticsearch.')) {
          this.workflowLogger.logInfo(`Creating Elasticsearch action step: ${atomicStepType}`, {
            event: { action: 'internal-action-creation', outcome: 'success' },
            tags: ['step-factory', 'elasticsearch', 'internal-action'],
          });
          return new ElasticsearchActionStepImpl(
            step as any,
            this.contextManager,
            this.workflowRuntime,
            this.workflowLogger
          );
        }

        if (atomicStepType && atomicStepType.startsWith('kibana.')) {
          this.workflowLogger.logInfo(`Creating Kibana action step: ${atomicStepType}`, {
            event: { action: 'internal-action-creation', outcome: 'success' },
            tags: ['step-factory', 'kibana', 'internal-action'],
          });
          return new KibanaActionStepImpl(
            step as any,
            this.contextManager,
            this.workflowRuntime,
            this.workflowLogger
          );
        }

        // Default atomic step (connector-based)
        return new AtomicStepImpl(
          step as any,
          this.contextManager,
          this.connectorExecutor,
          this.workflowRuntime,
          this.workflowLogger
        );
      case 'http':
        return new HttpStepImpl(
          step as any,
          this.contextManager,
          this.workflowLogger,
          this.urlValidator,
          this.workflowRuntime
        );
      case 'parallel':
        throw new Error(`Parallel step not implemented yet: ${stepType}`);
      case 'merge':
        throw new Error(`Merge step not implemented yet: ${stepType}`);
      default:
        // Handle elasticsearch.* and kibana.* actions
        if (isElasticsearchAction) {
          this.workflowLogger.logInfo(`Creating Elasticsearch action step: ${stepType}`, {
            event: { action: 'internal-action-creation', outcome: 'success' },
            tags: ['step-factory', 'elasticsearch', 'internal-action'],
          });
          return new ElasticsearchActionStepImpl(
            step as any,
            this.contextManager,
            this.workflowRuntime,
            this.workflowLogger
          );
        }

        if (isKibanaAction) {
          this.workflowLogger.logInfo(`Creating Kibana action step: ${stepType}`, {
            event: { action: 'internal-action-creation', outcome: 'success' },
            tags: ['step-factory', 'kibana', 'internal-action'],
          });
          return new KibanaActionStepImpl(
            step as any,
            this.contextManager,
            this.workflowRuntime,
            this.workflowLogger
          );
        }

        throw new Error(`Unknown node type: ${stepType}`);
    }
  }
}
