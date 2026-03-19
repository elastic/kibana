/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterCaseBranchNode, EnterSwitchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class EnterSwitchNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterSwitchNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowGraph: WorkflowGraph,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowContextLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    const successors = this.getValidatedSuccessors();
    const renderedExpression = this.evaluateExpression();
    const caseBranches = this.getCaseBranches(successors);
    const matchingCase = this.findMatchingCase(caseBranches, renderedExpression);

    if (matchingCase) {
      this.workflowContextLogger.logDebug(
        `Switch expression "${this.node.configuration.expression}" evaluated to "${renderedExpression}" for step ${this.node.stepId}. Matched case ${matchingCase.index}.`
      );
      this.setStepStateAndNavigate(
        { matchedValue: renderedExpression, matchedIndex: matchingCase.index },
        matchingCase.id
      );
      return;
    }

    const defaultBranch = this.getDefaultBranch(successors);
    if (defaultBranch) {
      this.setStepStateAndNavigate({ matchedValue: undefined, matchedIndex: -1 }, defaultBranch.id);
      return;
    }
    this.setStepStateAndNavigate(
      { matchedValue: undefined, matchedIndex: -1 },
      this.node.exitNodeId
    );
  }

  private getValidatedSuccessors(): ReturnType<WorkflowGraph['getDirectSuccessors']> {
    const successors = this.workflowGraph.getDirectSuccessors(this.node.id);
    const allowedTypes = new Set(['enter-case-branch', 'enter-default-branch']);
    const invalidSuccessors = successors.filter((s: { type: string }) => !allowedTypes.has(s.type));
    if (invalidSuccessors.length > 0) {
      throw new Error(
        `EnterSwitchNode with id ${
          this.node.id
        } must have only 'enter-case-branch' or 'enter-default-branch' successors, but found: ${invalidSuccessors
          .map((s: { type: string }) => s.type)
          .join(', ')}.`
      );
    }
    return successors;
  }

  private evaluateExpression(): string {
    const { expression } = this.node.configuration;
    const renderedExpression =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(expression);
    this.stepExecutionRuntime.setInput({
      rawExpression: expression,
      expression: renderedExpression,
    });
    return renderedExpression;
  }

  private getCaseBranches(
    successors: ReturnType<WorkflowGraph['getDirectSuccessors']>
  ): EnterCaseBranchNode[] {
    return successors
      .filter((s): s is EnterCaseBranchNode => s.type === 'enter-case-branch')
      .sort((a, b) => a.index - b.index);
  }

  private findMatchingCase(
    caseBranches: EnterCaseBranchNode[],
    renderedExpression: string
  ): EnterCaseBranchNode | undefined {
    return caseBranches.find((c) => {
      const renderedMatch =
        typeof c.match === 'string'
          ? this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(c.match)
          : c.match;
      return String(renderedMatch) === String(renderedExpression);
    });
  }

  private getDefaultBranch(
    successors: ReturnType<WorkflowGraph['getDirectSuccessors']>
  ): { id: string } | undefined {
    return successors.find((s: { type: string }) => s.type === 'enter-default-branch') as
      | { id: string }
      | undefined;
  }

  private setStepStateAndNavigate(
    state: { matchedValue: unknown; matchedIndex: number },
    targetNodeId: string
  ): void {
    this.stepExecutionRuntime.setCurrentStepState(state);
    this.wfExecutionRuntimeManager.navigateToNode(targetNodeId);
  }
}
