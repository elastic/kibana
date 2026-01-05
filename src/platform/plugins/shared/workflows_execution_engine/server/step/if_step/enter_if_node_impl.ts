/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KQLSyntaxError } from '@kbn/es-query';
import type { EnterConditionBranchNode, EnterIfNode, WorkflowGraph } from '@kbn/workflows/graph';
import { evaluateKql } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class EnterIfNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterIfNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowGraph: WorkflowGraph,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowContextLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successors: any[] = this.workflowGraph.getDirectSuccessors(this.node.id);

    if (
      successors.some((node) => !['enter-then-branch', 'enter-else-branch'].includes(node.type))
    ) {
      throw new Error(
        `EnterIfNode with id ${
          this.node.id
        } must have only 'enter-then-branch' or 'enter-else-branch' successors, but found: ${successors
          .map((node) => node.type)
          .join(', ')}.`
      );
    }

    const thenNode = successors?.find((node) =>
      Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode;
    // multiple else-if could be implemented similarly to thenNode
    const elseNode = successors?.find(
      (node) => !Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode;
    const renderedCondition =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(thenNode.condition);
    const evaluatedConditionResult = this.evaluateCondition(renderedCondition);
    this.stepExecutionRuntime.setInput({
      condition: renderedCondition,
      conditionResult: evaluatedConditionResult,
    });

    if (evaluatedConditionResult) {
      this.goToThenBranch(thenNode);
    } else if (elseNode) {
      this.goToElseBranch(thenNode, elseNode);
    } else {
      // in the case when the condition evaluates to false and no else branch is defined
      // we go straight to the exit node skipping "then" branch
      this.goToExitNode(thenNode);
    }
  }

  private goToThenBranch(thenNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to true for step ${this.node.stepId}. Going to then branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(thenNode.id);
  }

  private goToElseBranch(
    thenNode: EnterConditionBranchNode,
    elseNode: EnterConditionBranchNode
  ): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to false for step ${this.node.stepId}. Going to else branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(elseNode.id);
  }

  private goToExitNode(thenNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to false for step ${this.node.stepId}. No else branch defined. Exiting if condition.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
  }

  private evaluateCondition(condition: string | boolean | undefined): boolean {
    if (typeof condition === 'boolean') {
      return condition;
    }
    if (typeof condition === 'undefined') {
      return false;
    }

    if (typeof condition === 'string') {
      try {
        return evaluateKql(condition, this.stepExecutionRuntime.contextManager.getContext());
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
      `Invalid condition type for step ${this.node.stepId}. ` +
        `Got ${JSON.stringify(
          condition
        )} (type: ${typeof condition}), but expected boolean or string. ` +
        `When using templating syntax, the expression must evaluate to a boolean or string (KQL expression).`
    );
  }
}
