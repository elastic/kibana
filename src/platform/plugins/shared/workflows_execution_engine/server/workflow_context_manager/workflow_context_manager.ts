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
import { KQLSyntaxError } from '@kbn/es-query';
import {
  type SerializedError,
  type StackFrame,
  type StepContext,
  type WorkflowContext,
} from '@kbn/workflows';
import { parseJsPropertyAccess } from '@kbn/workflows/common/utils';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { buildWorkflowContext } from './build_workflow_context';
import type { ContextDependencies } from './types';
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';
import type { WorkflowTemplatingEngine } from '../templating_engine';
import { buildStepExecutionId, evaluateKql } from '../utils';

export interface ContextManagerInit {
  // New properties for logging
  templateEngine: WorkflowTemplatingEngine;
  workflowExecutionGraph: WorkflowGraph;
  workflowExecutionState: WorkflowExecutionState;
  node: GraphNodeUnion;
  stackFrames: StackFrame[];
  // New properties for internal actions
  esClient: ElasticsearchClient; // ES client (user-scoped if available, fallback otherwise)
  fakeRequest: KibanaRequest;
  coreStart: CoreStart; // For using Kibana's internal HTTP client
  dependencies: ContextDependencies;
}

export class WorkflowContextManager {
  private workflowExecutionGraph: WorkflowGraph;
  private workflowExecutionState: WorkflowExecutionState;
  private esClient: ElasticsearchClient;
  private templateEngine: WorkflowTemplatingEngine;
  private fakeRequest: KibanaRequest;
  private coreStart: CoreStart;
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
      variables: this.getVariables(),
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
  public renderValueAccordingToContext<T>(obj: T, additionalContext?: Record<string, unknown>): T {
    const context = this.getContext();
    return this.templateEngine.render(obj, { ...context, ...additionalContext });
  }

  public evaluateExpressionInContext(template: string): unknown {
    const context = this.getContext();
    return this.templateEngine.evaluateExpression(template, context);
  }

  public evaluateBooleanExpressionInContext(
    condition: string | boolean | undefined,
    additionalContext?: Record<string, unknown>
  ): boolean {
    const renderedCondition = this.renderValueAccordingToContext(condition, additionalContext);

    if (typeof renderedCondition === 'boolean') {
      return renderedCondition;
    }
    if (typeof renderedCondition === 'undefined') {
      return false;
    }

    if (typeof renderedCondition === 'string') {
      try {
        return evaluateKql(renderedCondition, this.getContext());
      } catch (error) {
        if (error instanceof KQLSyntaxError) {
          throw new Error(
            `Syntax error in condition "${condition}" for step ${this.node.stepId}: ${String(
              error
            )}`
          );
        }
        throw error;
      }
    }

    throw new Error(
      `Invalid condition.` +
        `Got ${JSON.stringify(
          condition
        )} (type: ${typeof condition}), but expected boolean or string. ` +
        `When using templating syntax, the expression must evaluate to a boolean or string (KQL expression).`
    );
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
  public getFakeRequest(): KibanaRequest {
    return this.fakeRequest;
  }

  /**
   * Get CoreStart for accessing Kibana's internal services
   */
  public getCoreStart(): CoreStart {
    return this.coreStart;
  }

  /**
   * Get variables from all completed data.set steps in the workflow execution.
   * Variables are retrieved from step outputs, which are persisted in execution state.
   * This ensures variables survive across wait steps and task resumptions.
   * Steps are processed in execution order to ensure consistent variable assignment.
   */
  public getVariables(): Record<string, unknown> {
    return this.workflowExecutionState
      .getAllStepExecutions()
      .filter(
        (stepExecution) =>
          stepExecution.stepType === 'data.set' &&
          typeof stepExecution.output === 'object' &&
          !Array.isArray(stepExecution.output)
      )
      .filter((stepExecution) => stepExecution.output)
      .sort((a, b) => a.globalExecutionIndex - b.globalExecutionIndex)
      .reduce((acc, stepExecution) => {
        Object.assign(acc, stepExecution.output);
        return acc;
      }, {});
  }

  /**
   * Get dependencies
   */
  public getDependencies(): ContextDependencies {
    return this.dependencies;
  }

  private buildWorkflowContext(): WorkflowContext {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    return buildWorkflowContext(workflowExecution, this.coreStart, this.dependencies);
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

        if (topFrame.scopeId === 'fallback') {
          // This is not good approach, but we can't do it better right now.
          // The problem is that Context is dynamic depending on the step scopes (like whether the current step is inside foreach, fallback path, etc)
          // but here we are trying to mutate the static StepContext object.
          // Proper solution would be to have dynamic context object that would resolve properties on demand,
          // but it requires significant changes in the codebase.
          // So for now, we just set the error on the context when we are in fallback scope.
          const stepContextGeneric = stepContext as Record<string, unknown>;
          if (!stepContextGeneric.error) {
            stepContextGeneric.error = stepExecution.state?.error;
          }
        }
      }
    }
  }

  private getStepData(stepId: string):
    | {
        runStepResult: {
          input: unknown;
          output: unknown;
          error: SerializedError | undefined;
        };
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
