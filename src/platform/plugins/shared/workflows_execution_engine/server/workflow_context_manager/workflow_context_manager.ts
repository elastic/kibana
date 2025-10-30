/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StackFrame, StepContext, WorkflowContext } from '@kbn/workflows';
import { parseJsPropertyAccess } from '@kbn/workflows/common/utils';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { RunStepResult } from '../step/node_implementation';
import type { WorkflowTemplatingEngine } from '../templating_engine';
import { buildStepExecutionId } from '../utils';

export interface ContextManagerInit {
  // New properties for logging
  templateEngine: WorkflowTemplatingEngine;
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionState: WorkflowExecutionState;
  node: GraphNodeUnion;
  stackFrames: StackFrame[];
  // New properties for internal actions
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest?: KibanaRequest;
  coreStart?: CoreStart; // For using Kibana's internal HTTP client
  dependencies: ContextDependencies;
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionState: WorkflowExecutionState;
  private esClient: ElasticsearchClient;
  private templateEngine: WorkflowTemplatingEngine;
  private fakeRequest?: KibanaRequest;
  private coreStart?: CoreStart;
  private dependencies: ContextDependencies;

  private stackFrames: StackFrame[];
  public readonly node: GraphNodeUnion;

  public get scopeStack(): WorkflowScopeStack {
    return WorkflowScopeStack.fromStackFrames(this.stackFrames);
  }

  constructor(init: ContextManagerInit) {
    this.workflowExecutionGraph = init.workflowExecutionGraph;
    this.workflowExecutionState = init.workflowExecutionState;
    this.esClient = init.esClient;
    this.fakeRequest = init.fakeRequest;
    this.coreStart = init.coreStart;
    this.node = init.node;
    this.stackFrames = init.stackFrames;
    this.templateEngine = init.templateEngine;
    this.dependencies = init.dependencies;
  }

  // Any change here should be reflected in the 'getContextSchemaForPath' function for frontend validation to work
  // src/platform/plugins/shared/workflows_management/public/features/workflow_context/lib/get_context_for_path.ts
  public getContext(): StepContext {
    const stepContext: StepContext = {
      ...this.buildWorkflowContext(),
      steps: {},
    };

    const currentNode = this.node;
    const currentNodeId = currentNode.id;

    const allPredecessors = this.workflowExecutionGraph.getAllPredecessors(currentNodeId);
    allPredecessors.forEach((node) => {
      const stepId = node.stepId;
      const stepData = this.getStepData(stepId);

      if (stepData) {
        stepContext.steps[stepId] = {};
        if (stepData.runStepResult) {
          stepContext.steps[stepId] = {
            ...stepContext.steps[stepId],
            ...stepData.runStepResult,
          };
        }

        if (stepData.stepState) {
          stepContext.steps[stepId] = {
            ...stepContext.steps[stepId],
            ...stepData.stepState,
          };
        }
      }
    });

    this.enrichStepContextAccordingToStepScope(stepContext);
    this.enrichStepContextWithMockedData(stepContext);
    return stepContext;
  }

  /**
   * Recursively resolves template expressions in any value (string, object, array, or primitive).
   *
   * This method traverses the input value and replaces all template expressions (e.g., `{{workflow.id}}`,
   * `{{steps.step1.output}}`) with their actual values from the current workflow execution context.
   *
   * @param obj - The value to render. Can be:
   *   - A string with template expressions: `"{{workflow.name}}"`
   *   - An object with string properties: `{ name: "{{workflow.name}}", id: "{{workflow.id}}" }`
   *   - An array: `["{{step1.output}}", "static value"]`
   *   - A nested structure combining any of the above
   *   - Primitive values (numbers, booleans) are returned as-is
   *
   * @returns The same type as the input, with all template expressions resolved to their actual values
   *
   * @example
   * ```typescript
   * // Render a simple string
   * const result = contextManager.renderValueAccordingToContext("Workflow: {{workflow.name}}");
   * // => "Workflow: My Workflow"
   *
   * // Render an object with templates
   * const config = contextManager.renderValueAccordingToContext({
   *   url: "{{steps.fetchData.output.apiUrl}}",
   *   headers: { "X-Request-Id": "{{execution.id}}" }
   * });
   * // => { url: "https://api.example.com", headers: { "X-Request-Id": "exec-123" } }
   * ```
   */
  public renderValueAccordingToContext<T>(obj: T): T {
    const context = this.getContext();
    return this.templateEngine.render(obj, context);
  }

  public evaluateExpressionInContext(template: string): unknown {
    const context = this.getContext();
    return this.templateEngine.evaluateExpression(template, context);
  }

  public readContextPath(propertyPath: string): { pathExists: boolean; value: unknown } {
    const propertyPathSegments = parseJsPropertyAccess(propertyPath);
    let result: unknown = this.getContext();

    for (const segment of propertyPathSegments) {
      if (result === null || result === undefined || typeof result !== 'object') {
        return { pathExists: false, value: undefined }; // Path not found in context
      }

      const resultAsRecord = result as Record<string, unknown>;
      if (!(segment in resultAsRecord)) {
        return { pathExists: false, value: undefined }; // Path not found in context
      }

      result = resultAsRecord[segment];
    }

    return { pathExists: true, value: result };
  }

  /**
   * Get the Elasticsearch client for internal actions
   * This client is already user-scoped if fakeRequest was available during initialization
   */
  public getEsClientAsUser(): ElasticsearchClient {
    return this.esClient;
  }

  /**
   * Get the fake request from task manager for Kibana API authentication
   */
  public getFakeRequest(): KibanaRequest | undefined {
    return this.fakeRequest;
  }

  /**
   * Get CoreStart for accessing Kibana's internal services
   */
  public getCoreStart(): CoreStart | undefined {
    return this.coreStart;
  }

  /**
   * Get dependencies
   */
  public getDependencies(): ContextDependencies {
    return this.dependencies;
  }

  private buildWorkflowContext(): WorkflowContext {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();

    return {
      execution: {
        id: workflowExecution.id,
        isTestRun: !!workflowExecution.isTestRun,
        startedAt: new Date(workflowExecution.startedAt),
      },
      workflow: {
        id: workflowExecution.workflowId,
        name: workflowExecution.workflowDefinition.name,
        enabled: workflowExecution.workflowDefinition.enabled,
        spaceId: workflowExecution.spaceId,
      },
      consts: workflowExecution.workflowDefinition.consts || {},
      event: workflowExecution.context?.event,
      inputs: workflowExecution.context?.inputs,
    };
  }

  private enrichStepContextWithMockedData(stepContext: StepContext): void {
    const contextOverride: StepContext | undefined =
      this.workflowExecutionState.getWorkflowExecution().context?.contextOverride;

    if (contextOverride) {
      stepContext.consts = {
        ...stepContext.consts,
        ...(contextOverride.consts || {}),
      };

      stepContext.inputs = {
        ...stepContext.inputs,
        ...(contextOverride.inputs || {}),
      };

      stepContext.event = {
        ...stepContext.event,
        ...(contextOverride.event || {}),
      } as StepContext['event'];

      stepContext.execution = {
        ...stepContext.execution,
        ...(contextOverride.execution || {}),
      };

      stepContext.workflow = {
        ...stepContext.workflow,
        ...(contextOverride.workflow || {}),
      };

      if (!stepContext.foreach) {
        stepContext.foreach = contextOverride.foreach;
      }

      Object.entries(contextOverride.steps || {}).forEach(([stepId, stepData]) => {
        if (!stepContext.steps[stepId]) {
          stepContext.steps[stepId] = stepData;
        }
      });
    }
  }

  private enrichStepContextAccordingToStepScope(stepContext: StepContext): void {
    let scopeStack = WorkflowScopeStack.fromStackFrames(
      this.workflowExecutionState.getWorkflowExecution().scopeStack
    );

    while (!scopeStack.isEmpty()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const topFrame = scopeStack.getCurrentScope()!;
      scopeStack = scopeStack.exitScope();
      const stepExecution = this.workflowExecutionState.getStepExecution(
        buildStepExecutionId(
          this.workflowExecutionState.getWorkflowExecution().id,
          topFrame.stepId,
          scopeStack.stackFrames
        )
      );

      if (stepExecution) {
        switch (stepExecution.stepType) {
          case 'foreach':
            if (!stepContext.foreach) {
              stepContext.foreach = stepExecution.state as StepContext['foreach'];
            }
            break;
        }
      }
    }
  }

  private getStepData(stepId: string):
    | {
        runStepResult: RunStepResult;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stepState: Record<string, any> | undefined;
      }
    | undefined {
    const latestStepExecution = this.workflowExecutionState.getLatestStepExecution(stepId);
    if (!latestStepExecution) {
      return;
    }

    return {
      runStepResult: {
        input: latestStepExecution?.input,
        output: latestStepExecution?.output,
        error: latestStepExecution?.error,
      },
      stepState: latestStepExecution.state,
    };
  }
}
