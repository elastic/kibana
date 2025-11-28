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
import { evaluateKql } from './eval_kql';
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
      successors.some(
        (node) =>
          !['enter-then-branch', 'enter-else-if-branch', 'enter-else-branch'].includes(node.type)
      )
    ) {
      throw new Error(
        `EnterIfNode with id ${
          this.node.id
        } must have only 'enter-then-branch', 'enter-else-if-branch', or 'enter-else-branch' successors, but found: ${successors
          .map((node) => node.type)
          .join(', ')}.`
      );
    }

    // Find then node (has condition and is enter-then-branch)
    const thenNode = successors?.find(
      (node) => node.type === 'enter-then-branch' && Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode | undefined;

    if (!thenNode) {
      throw new Error(
        `EnterIfNode with id ${this.node.id} must have a 'enter-then-branch' successor, but none was found.`
      );
    }

    // Find all elseIf nodes (has condition and is enter-else-if-branch), sorted by their order
    // Extract numeric index from id format: enterElseIf_${stepId}_${i}
    const extractIndex = (id: string): number => {
      const match = id.match(/_(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };
    const elseIfNodes =
      successors
        ?.filter((node) => node.type === 'enter-else-if-branch' && Object.hasOwn(node, 'condition'))
        .map((node) => node as EnterConditionBranchNode)
        .sort((a, b) => extractIndex(a.id) - extractIndex(b.id)) || [];

    // Find else node (no condition and is enter-else-branch)
    const elseNode = successors?.find(
      (node) => node.type === 'enter-else-branch' && !Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode | undefined;

    // Evaluate then condition first
    if (this.evaluateAndSetCondition(thenNode.condition)) {
      this.goToThenBranch(thenNode);
      return;
    }

    // Evaluate elseIf conditions in order
    for (const elseIfNode of elseIfNodes) {
      if (this.evaluateAndSetCondition(elseIfNode.condition)) {
        this.goToElseIfBranch(elseIfNode);
        return;
      }
    }

    // If no conditions matched, go to else or exit
    if (elseNode) {
      this.goToElseBranch(elseNode);
    } else {
      // in the case when the condition evaluates to false and no else branch is defined
      // we go straight to the exit node skipping all branches
      this.goToExitNode();
    }
  }

  private goToThenBranch(thenNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to true for step ${this.node.stepId}. Going to then branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(thenNode.id);
  }

  private goToElseIfBranch(elseIfNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `Condition "${elseIfNode.condition}" evaluated to true for step ${this.node.stepId}. Going to else-if branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(elseIfNode.id);
  }

  private evaluateAndSetCondition(condition: string | undefined): boolean {
    const renderedCondition =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(condition);
    const evaluatedConditionResult = this.evaluateCondition(renderedCondition);
    this.stepExecutionRuntime.setInput({
      condition: renderedCondition,
      conditionResult: evaluatedConditionResult,
    });
    return evaluatedConditionResult;
  }

  private goToElseBranch(elseNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `All conditions evaluated to false for step ${this.node.stepId}. Going to else branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(elseNode.id);
  }

  private goToExitNode(): void {
    this.workflowContextLogger.logDebug(
      `All conditions evaluated to false for step ${this.node.stepId}. No else branch defined. Exiting if condition.`
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
