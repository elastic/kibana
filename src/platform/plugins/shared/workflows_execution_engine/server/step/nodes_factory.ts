/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AtomicGraphNode,
  EnterConditionBranchNode,
  EnterContinueNode,
  EnterForeachNode,
  EnterIfNode,
  EnterNormalPathNode,
  EnterRetryNode,
  EnterTryBlockNode,
  ExitConditionBranchNode,
  ExitFallbackPathNode,
  ExitForeachNode,
  ExitNormalPathNode,
  ExitRetryNode,
  HttpGraphNode,
  GraphNodeUnion,
  WorkflowGraph,
} from '@kbn/workflows/graph';
import {
  isEnterWorkflowTimeoutZone,
  isExitWorkflowTimeoutZone,
  isEnterStepTimeoutZone,
  isExitStepTimeoutZone,
} from '@kbn/workflows/graph';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { NodeImplementation } from './node_implementation';
// Import schema and inferred types
import type { ConnectorExecutor } from '../connector_executor';
import type { UrlValidator } from '../lib/url_validator';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { AtomicStepImpl } from './atomic_step/atomic_step_impl';
import { EnterForeachNodeImpl, ExitForeachNodeImpl } from './foreach_step';
import { HttpStepImpl } from './http_step';
import {
  EnterConditionBranchNodeImpl,
  EnterIfNodeImpl,
  ExitConditionBranchNodeImpl,
  ExitIfNodeImpl,
} from './if_step';
import { EnterRetryNodeImpl, ExitRetryNodeImpl } from './on_failure/retry_step';
import { EnterContinueNodeImpl, ExitContinueNodeImpl } from './on_failure/continue_step';
import {
  EnterTryBlockNodeImpl,
  ExitTryBlockNodeImpl,
  EnterNormalPathNodeImpl,
  ExitNormalPathNodeImpl,
  EnterFallbackPathNodeImpl,
  ExitFallbackPathNodeImpl,
} from './on_failure/fallback-step';
import {
  EnterWorkflowTimeoutZoneNodeImpl,
  ExitWorkflowTimeoutZoneNodeImpl,
  EnterStepTimeoutZoneNodeImpl,
  ExitStepTimeoutZoneNodeImpl,
} from './timeout_zone_step';
import { WaitStepImpl } from './wait_step/wait_step';
import { ElasticsearchActionStepImpl } from './elasticsearch_action_step';
import { KibanaActionStepImpl } from './kibana_action_step';

export class NodesFactory {
  constructor(
    private connectorExecutor: ConnectorExecutor, // this is temporary, we will remove it when we have a proper connector executor
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowExecutionState: WorkflowExecutionState,
    private workflowLogger: IWorkflowEventLogger, // Assuming you have a logger interface
    private workflowTaskManager: WorkflowTaskManager,
    private urlValidator: UrlValidator,
    private workflowGraph: WorkflowGraph
  ) {}

  public create(contextManager: WorkflowContextManager): NodeImplementation {
    const node = contextManager.node;
    const stepLogger = this.workflowLogger.createStepLogger(
      this.workflowRuntime.getCurrentStepExecutionId(),
      node.stepId,
      node.stepId,
      node.stepType
    );

    // Handle elasticsearch.* and kibana.* actions
    if (node.stepType && node.stepType.startsWith('elasticsearch.')) {
      this.workflowLogger.logInfo(`Creating Elasticsearch action step: ${node.stepType}`, {
        event: { action: 'internal-action-creation', outcome: 'success' },
        tags: ['step-factory', 'elasticsearch', 'internal-action'],
      });
      return new ElasticsearchActionStepImpl(
        node as any,
        contextManager,
        this.workflowRuntime,
        this.workflowLogger
      );
    }

    if (node.stepType && node.stepType.startsWith('kibana.')) {
      this.workflowLogger.logInfo(`Creating Kibana action step: ${node.stepType}`, {
        event: { action: 'internal-action-creation', outcome: 'success' },
        tags: ['step-factory', 'kibana', 'internal-action'],
      });
      return new KibanaActionStepImpl(
        node as any,
        contextManager,
        this.workflowRuntime,
        this.workflowLogger
      );
    }

    switch (node.type) {
      case 'enter-foreach':
        return new EnterForeachNodeImpl(
          node as EnterForeachNode,
          this.workflowRuntime,
          contextManager,
          stepLogger
        );
      case 'exit-foreach':
        return new ExitForeachNodeImpl(node as ExitForeachNode, this.workflowRuntime, stepLogger);
      case 'enter-retry':
        return new EnterRetryNodeImpl(
          node as EnterRetryNode,
          this.workflowRuntime,
          this.workflowTaskManager,
          stepLogger
        );
      case 'exit-retry':
        return new ExitRetryNodeImpl(node as ExitRetryNode, this.workflowRuntime, stepLogger);
      case 'enter-continue':
        return new EnterContinueNodeImpl(
          node as EnterContinueNode,
          this.workflowRuntime,
          stepLogger
        );
      case 'exit-continue':
        return new ExitContinueNodeImpl(this.workflowRuntime);
      case 'enter-try-block':
        return new EnterTryBlockNodeImpl(node as EnterTryBlockNode, this.workflowRuntime);
      case 'exit-try-block':
        return new ExitTryBlockNodeImpl(this.workflowRuntime);
      case 'enter-normal-path':
        return new EnterNormalPathNodeImpl(
          node as EnterNormalPathNode,
          this.workflowRuntime,
          stepLogger
        );
      case 'enter-fallback-path':
        return new EnterFallbackPathNodeImpl(this.workflowRuntime);
      case 'exit-normal-path':
        return new ExitNormalPathNodeImpl(node as ExitNormalPathNode, this.workflowRuntime);
      case 'exit-fallback-path':
        return new ExitFallbackPathNodeImpl(node as ExitFallbackPathNode, this.workflowRuntime);
      case 'enter-timeout-zone':
        if (isEnterWorkflowTimeoutZone(node)) {
          return new EnterWorkflowTimeoutZoneNodeImpl(
            node,
            this.workflowRuntime,
            this.workflowExecutionState,
            contextManager
          );
        }

        if (isEnterStepTimeoutZone(node)) {
          return new EnterStepTimeoutZoneNodeImpl(
            node,
            this.workflowRuntime,
            this.workflowExecutionState,
            contextManager
          );
        }
      case 'exit-timeout-zone':
        if (isExitWorkflowTimeoutZone(node)) {
          return new ExitWorkflowTimeoutZoneNodeImpl(this.workflowRuntime);
        }

        if (isExitStepTimeoutZone(node)) {
          return new ExitStepTimeoutZoneNodeImpl(this.workflowRuntime);
        }
      case 'enter-if':
        return new EnterIfNodeImpl(
          node as EnterIfNode,
          this.workflowRuntime,
          this.workflowGraph,
          contextManager,
          stepLogger
        );
      case 'enter-then-branch':
      case 'enter-else-branch':
        return new EnterConditionBranchNodeImpl(
          node as EnterConditionBranchNode,
          this.workflowRuntime
        );
      case 'exit-then-branch':
      case 'exit-else-branch':
        return new ExitConditionBranchNodeImpl(
          node as ExitConditionBranchNode,
          this.workflowGraph,
          this.workflowRuntime
        );
      case 'exit-if':
        return new ExitIfNodeImpl(this.workflowRuntime);
      case 'wait':
        return new WaitStepImpl(
          node as any,
          contextManager,
          this.workflowRuntime,
          stepLogger,
          this.workflowTaskManager
        );
      case 'atomic':
        // Default atomic step (connector-based)
        return new AtomicStepImpl(
          node as AtomicGraphNode,
          contextManager,
          this.connectorExecutor,
          this.workflowRuntime,
          stepLogger
        );
      case 'http':
        return new HttpStepImpl(
          node as HttpGraphNode,
          contextManager,
          stepLogger,
          this.urlValidator,
          this.workflowRuntime
        );
      default:
        throw new Error(`Unknown node type: ${(node as GraphNodeUnion).stepType}`);
    }
  }
}
