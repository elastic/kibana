/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterIfNode, EnterConditionBranchNode } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { KQLSyntaxError } from '@kbn/es-query';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { evaluateKql } from './eval_kql';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class EnterIfNodeImpl implements StepImplementation {
  constructor(
    private step: EnterIfNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowGraph: WorkflowGraph,
    private workflowContextManager: WorkflowContextManager,
    private workflowContextLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    await this.wfExecutionRuntimeManager.startStep(this.step.id);
    this.wfExecutionRuntimeManager.enterScope();
    const successors: any[] = this.workflowGraph.getDirectSuccessors(this.step.id);

    if (
      successors.some((node) => !['enter-then-branch', 'enter-else-branch'].includes(node.type))
    ) {
      throw new Error(
        `EnterIfNode with id ${
          this.step.id
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

    const evaluatedConditionResult = this.evaluateCondition(thenNode.condition);

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
      `Condition "${thenNode.condition}" evaluated to true for step ${this.step.id}. Going to then branch.`
    );
    this.wfExecutionRuntimeManager.goToStep(thenNode.id);
  }

  private goToElseBranch(
    thenNode: EnterConditionBranchNode,
    elseNode: EnterConditionBranchNode
  ): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to false for step ${this.step.id}. Going to else branch.`
    );
    this.wfExecutionRuntimeManager.goToStep(elseNode.id);
  }

  private goToExitNode(thenNode: EnterConditionBranchNode): void {
    this.workflowContextLogger.logDebug(
      `Condition "${thenNode.condition}" evaluated to false for step ${this.step.id}. No else branch defined. Exiting if condition.`
    );
    this.wfExecutionRuntimeManager.goToStep(this.step.exitNodeId);
  }

  private evaluateCondition(condition: string | boolean | undefined): boolean {
    if (typeof condition === 'boolean') {
      return condition;
    } else if (typeof condition === 'undefined') {
      return false; // Undefined condition defaults to false
    }

    try {
      return evaluateKql(condition, this.workflowContextManager.getContext());
    } catch (error) {
      if (error instanceof KQLSyntaxError) {
        throw new Error(
          `Syntax error in condition "${condition}" for step ${this.step.id}: ${String(error)}`
        );
      }

      throw error;
    }
  }
}
