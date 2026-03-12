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

    const { expression } = this.node.configuration;
    const renderedExpression =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(expression);

    this.stepExecutionRuntime.setInput({
      rawExpression: expression,
      expression: renderedExpression,
    });

    const caseBranches = successors
      .filter((s: { type: string }) => s.type === 'enter-case-branch')
      .sort(
        (a: EnterCaseBranchNode, b: EnterCaseBranchNode) => a.index - b.index
      ) as EnterCaseBranchNode[];

    const matchingCase = caseBranches.find((c) => {
      const renderedValue =
        typeof c.value === 'string'
          ? this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(c.value)
          : c.value;
      return String(renderedValue) === String(renderedExpression);
    });

    if (matchingCase) {
      const renderedMatchedValue =
        typeof matchingCase.value === 'string'
          ? this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
              matchingCase.value
            )
          : matchingCase.value;
      this.workflowContextLogger.logDebug(
        `Switch expression "${expression}" evaluated to "${renderedExpression}" for step ${this.node.stepId}. Matched case value "${renderedMatchedValue}" (raw: "${matchingCase.value}").`
      );
      this.stepExecutionRuntime.setCurrentStepState({
        matchedValue: matchingCase.value,
        matchedIndex: matchingCase.index,
      });
      this.wfExecutionRuntimeManager.navigateToNode(matchingCase.id);
      return;
    }

    const defaultBranch = successors.find(
      (s: { type: string }) => s.type === 'enter-default-branch'
    );
    if (defaultBranch) {
      this.workflowContextLogger.logDebug(
        `Switch expression "${expression}" evaluated to "${renderedExpression}" for step ${this.node.stepId}. No case matched. Going to default branch.`
      );
      this.stepExecutionRuntime.setCurrentStepState({
        matchedValue: undefined,
        matchedIndex: -1,
      });
      this.wfExecutionRuntimeManager.navigateToNode(defaultBranch.id);
      return;
    }

    this.workflowContextLogger.logDebug(
      `Switch expression "${expression}" evaluated to "${renderedExpression}" for step ${this.node.stepId}. No case matched and no default branch. Exiting switch.`
    );
    this.stepExecutionRuntime.setCurrentStepState({
      matchedValue: undefined,
      matchedIndex: -1,
    });
    this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
  }
}
