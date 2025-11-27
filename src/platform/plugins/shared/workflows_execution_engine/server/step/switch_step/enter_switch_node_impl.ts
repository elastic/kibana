/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EnterSwitchCaseNode,
  EnterSwitchDefaultNode,
  EnterSwitchNode,
  WorkflowGraph,
} from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successors: any[] = this.workflowGraph.getDirectSuccessors(this.node.id);

    const caseNodes = successors.filter(
      (node) => node.type === 'enter-switch-case'
    ) as EnterSwitchCaseNode[];
    const defaultNode = successors.find((node) => node.type === 'enter-switch-default') as
      | EnterSwitchDefaultNode
      | undefined;

    if (
      successors.some((node) => !['enter-switch-case', 'enter-switch-default'].includes(node.type))
    ) {
      throw new Error(
        `EnterSwitchNode with id ${
          this.node.id
        } must have only 'enter-switch-case' or 'enter-switch-default' successors, but found: ${successors
          .map((node) => node.type)
          .join(', ')}.`
      );
    }

    // Evaluate the switch expression once
    const renderedSwitchExpression =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
        this.node.configuration.switch
      );

    const checkedCases: string[] = [];
    let selectedCase: EnterSwitchCaseNode | null = null;
    let selectedCaseName: string | null = null;

    // Match the switch expression value against cases in order
    for (const caseNode of caseNodes) {
      checkedCases.push(caseNode.caseName);
      if (this.matchValue(renderedSwitchExpression, caseNode.match)) {
        selectedCase = caseNode;
        selectedCaseName = caseNode.caseName;
        break;
      }
    }

    // Set step input with evaluation metadata
    this.stepExecutionRuntime.setInput({
      switchValue: renderedSwitchExpression,
      selectedCase: selectedCaseName || (defaultNode ? 'default' : null),
      evaluation: {
        matched: selectedCase !== null,
        checkedCases,
      },
    });

    if (selectedCase) {
      this.goToCase(selectedCase);
    } else if (defaultNode) {
      this.goToDefault(defaultNode);
    } else {
      throw new Error(
        `No case matched and no default branch provided for switch step ${this.node.stepId}.`
      );
    }
  }

  private goToCase(caseNode: EnterSwitchCaseNode): void {
    this.workflowContextLogger.logDebug(
      `Case "${caseNode.caseName}" matched for switch step ${this.node.stepId}. Going to case branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(caseNode.id);
  }

  private goToDefault(defaultNode: EnterSwitchDefaultNode): void {
    this.workflowContextLogger.logDebug(
      `No case matched for switch step ${this.node.stepId}. Going to default branch.`
    );
    this.wfExecutionRuntimeManager.navigateToNode(defaultNode.id);
  }

  private matchValue(switchValue: unknown, matchValue: string | number | boolean): boolean {
    // Use strict equality for matching
    return switchValue === matchValue;
  }
}
