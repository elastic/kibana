/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARALLEL_MAX_FAN_OUT } from '@kbn/workflows';
import type { EnterParallelNode } from '@kbn/workflows/graph';
import type { ParallelBranchCoordinator } from './parallel_branch_coordinator';
import type { ParallelBranchState, ParallelStepState } from './types';
import { isTemplateExpression } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

/**
 * Fan-out half of the parallel step.
 *
 * Resolves the branch list, launches the first wave of branch executions, and
 * hands straight over to the exit node, which owns the join. The parent never
 * walks a branch body — each branch runs as its own execution over its own slice
 * of the graph — so this node does not park and does not iterate.
 */
export class EnterParallelNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterParallelNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger,
    private coordinator: ParallelBranchCoordinator
  ) {}

  public async run(): Promise<void> {
    // The exit node re-parks on the same step execution, and a resumed run
    // re-enters at the exit node, so reaching this node with state already
    // written means fan-out was interrupted before it navigated away. The
    // branch ids are derived, not allocated, so relaunching is a no-op for
    // branches that are already running.
    const existingState = this.stepExecutionRuntime.getCurrentStepState() as
      | ParallelStepState
      | undefined;

    const state = existingState ?? this.initState();

    await this.coordinator.launchEligibleBranches(state);
    this.stepExecutionRuntime.setCurrentStepState(state);
    this.wfExecutionRuntimeManager.navigateToNode(this.node.exitNodeId);
  }

  /**
   * Starts the step and builds its initial branch bookkeeping. An empty branch
   * list is valid: the exit node joins it immediately and writes the empty
   * aggregate.
   */
  private initState(): ParallelStepState {
    this.stepExecutionRuntime.startStep();

    const branches = this.coordinator.isStatic
      ? this.initStaticBranches()
      : this.initDynamicBranches();

    const state: ParallelStepState = {
      total: branches.length,
      branches,
      startedAt: Date.now(),
      static: this.coordinator.isStatic,
    };

    this.workflowLogger.logDebug(
      `Parallel step "${this.node.stepId}" fanning out over ${branches.length} branches.`,
      { workflow: { step_id: this.node.stepId } }
    );

    return state;
  }

  /**
   * Static scatter-gather: one branch per named branch descriptor on the enter
   * node. The branch `key` is its name, for correlation in the aggregate output.
   */
  private initStaticBranches(): ParallelBranchState[] {
    return (this.node.branches ?? []).map((branch, index) => ({
      index,
      key: branch.name,
      status: 'pending',
    }));
  }

  /** Dynamic fan-out: one branch per resolved `foreach` item. */
  private initDynamicBranches(): ParallelBranchState[] {
    const foreachConfig = this.node.configuration.foreach;
    // Persist the expression as input so the context builder can re-evaluate the
    // per-branch item without storing the whole list in state. Branch executions
    // read it back through their inherited scope.
    this.stepExecutionRuntime.setInput({
      foreach: Array.isArray(foreachConfig) ? JSON.stringify(foreachConfig) : foreachConfig,
    });

    const items = this.getItems();

    if (items.length > DEFAULT_PARALLEL_MAX_FAN_OUT) {
      throw new Error(
        `Parallel step "${this.node.stepId}" fan-out of ${items.length} exceeds the maximum of ${DEFAULT_PARALLEL_MAX_FAN_OUT}. ` +
          `Reduce the size of the "foreach" list.`
      );
    }

    // Snapshot each item as the branch's `key` at init. The exit node reads this
    // back instead of re-evaluating `foreach`, so the index→item correlation
    // cannot drift if the expression resolves to a different value later.
    return items.map((item, index) => ({
      index,
      key: item,
      status: 'pending',
    }));
  }

  private getItems(): unknown[] {
    const expression = this.node.configuration.foreach;

    if (Array.isArray(expression)) {
      return expression;
    }

    if (!expression) {
      throw new Error(
        `Parallel step "${this.node.stepId}" requires a "foreach" array or expression.`
      );
    }

    let resolved: unknown = isTemplateExpression(expression)
      ? this.stepExecutionRuntime.contextManager.evaluateExpressionInContext(expression)
      : this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(expression);

    // A rendered string is accepted only if it is a JSON array literal (e.g. a
    // template that produced `"[1,2,3]"`). Anything else — a scalar like
    // `"hello"`, or `"{...}"` — is conceptually "foreach is not an array", so we
    // funnel both the parse failure and the non-array result into the SAME clear
    // message instead of leaking a raw JSON parse error to the author.
    if (typeof resolved === 'string') {
      try {
        resolved = JSON.parse(resolved);
      } catch {
        resolved = undefined;
      }
    }

    if (!Array.isArray(resolved)) {
      throw new Error(
        `Parallel step "${this.node.stepId}" foreach expression must evaluate to an array, ` +
          `but "${expression}" did not. Provide a literal array or an expression that resolves to one.`
      );
    }

    return resolved;
  }
}
