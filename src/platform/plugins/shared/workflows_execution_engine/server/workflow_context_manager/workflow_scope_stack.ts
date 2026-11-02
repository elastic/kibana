/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';

export interface ScopeData {
  nodeId: string;
  stepId: string;
  nodeType: string;
  scopeId?: string;
}

/**
 * Manages the execution scope stack for workflow execution, tracking nested scopes within workflow steps.
 *
 * This class maintains an immutable stack of execution frames, where each frame represents a workflow step
 * and contains nested scopes for nodes executed within that step. It supports entering and exiting scopes
 * while preserving the hierarchical execution context.
 *
 * The class is immutable - all operations return new instances rather than modifying the current instance.
 * This ensures thread safety and enables features like execution rollback and debugging.
 */
export class WorkflowScopeStack {
  private _stackFrames: StackFrame[] = [];

  /**
   * Creates a new WorkflowScopeStack instance from existing stack frames.
   *
   * This static factory method creates a new immutable instance containing deep copies
   * of the provided frames to ensure isolation from the source data.
   *
   * @param stackFrames - Array of stack frames to initialize the scope stack with
   * @returns A new WorkflowScopeStack instance containing the cloned frames
   */
  public static fromStackFrames(stackFrames: StackFrame[]): WorkflowScopeStack {
    const instance = new WorkflowScopeStack();
    instance._stackFrames = instance.cloneFrames(stackFrames);
    return instance;
  }

  /**
   * Gets a deep copy of all stack frames in the current scope stack.
   *
   * Returns an immutable view of the internal stack frames to prevent external mutation
   * while allowing inspection of the current execution state.
   *
   * @returns A deep copy of the current stack frames array
   */
  public get stackFrames(): StackFrame[] {
    return this.cloneFrames(this._stackFrames);
  }

  /**
   * Checks if the workflow scope stack is empty.
   *
   * @returns True if the stack contains no frames, false otherwise.
   */
  isEmpty(): boolean {
    return this._stackFrames.length === 0;
  }

  /**
   * Retrieves the current scope data from the top of the scope stack.
   *
   * This method returns the scope information for the most recently entered scope
   * within the current step frame. Callers must check {@link isEmpty} before calling
   * this method.
   *
   * @returns The current scope data containing node ID, node type, scope ID, and step ID
   * @throws {Error} If the scope stack is empty
   */
  getCurrentScope(): ScopeData {
    const topFrame = this._stackFrames.at(-1);
    if (!topFrame) {
      throw new Error('ScopeStack is empty');
    }
    const topScope = topFrame.nestedScopes.at(-1);
    if (!topScope) {
      throw new Error('ScopeStack frame has no nested scopes');
    }
    return {
      nodeId: topScope.nodeId,
      nodeType: topScope.nodeType,
      scopeId: topScope.scopeId,
      stepId: topFrame.stepId,
    };
  }

  /**
   * Enters a new execution scope for the given graph node.
   *
   * If the node belongs to the same step as the current top frame, adds a new nested scope
   * to that frame. Otherwise, creates a new frame for the step. This method is immutable
   * and returns a new WorkflowScopeStack instance.
   *
   * @param enterScopeData - Data required to enter the new scope
   * @returns A new WorkflowScopeStack instance with the entered scope
   */
  public enterScope(enterScopeData: ScopeData): WorkflowScopeStack {
    const topFrame = this._stackFrames.at(-1);

    if (topFrame && topFrame.stepId === enterScopeData.stepId) {
      const lastScope = topFrame.nestedScopes.at(-1);

      if (lastScope && lastScope.nodeId === enterScopeData.nodeId) {
        if (enterScopeData.scopeId) {
          return WorkflowScopeStack.fromStackFrames([
            ...this._stackFrames.slice(0, -1),
            {
              ...topFrame,
              nestedScopes: [
                ...topFrame.nestedScopes.slice(0, -1),
                { ...lastScope, scopeId: enterScopeData.scopeId },
              ],
            },
          ]);
        }

        return WorkflowScopeStack.fromStackFrames(this._stackFrames);
      }

      return WorkflowScopeStack.fromStackFrames([
        ...this._stackFrames.slice(0, -1),
        {
          ...topFrame,
          nestedScopes: [
            ...topFrame.nestedScopes,
            {
              nodeId: enterScopeData.nodeId,
              nodeType: enterScopeData.nodeType,
              scopeId: enterScopeData.scopeId,
            },
          ],
        },
      ]);
    }

    return WorkflowScopeStack.fromStackFrames([
      ...this._stackFrames,
      {
        stepId: enterScopeData.stepId,
        nestedScopes: [
          {
            nodeId: enterScopeData.nodeId,
            nodeType: enterScopeData.nodeType,
            scopeId: enterScopeData.scopeId,
          },
        ],
      },
    ]);
  }

  /**
   * Exits the current execution scope for the given graph node.
   *
   * If the current top frame has multiple nested scopes for the same step, removes the most
   * recent scope. If only one scope remains, removes the entire frame. This method is immutable
   * and returns a new WorkflowScopeStack instance.
   *
   * @returns A new WorkflowScopeStack instance with the exited scope removed
   */
  public exitScope(): WorkflowScopeStack {
    const topFrame = this._stackFrames.at(-1);

    if (topFrame && topFrame.nestedScopes.length > 1) {
      return WorkflowScopeStack.fromStackFrames([
        ...this._stackFrames.slice(0, -1),
        { ...topFrame, nestedScopes: topFrame.nestedScopes.slice(0, -1) },
      ]);
    }

    return WorkflowScopeStack.fromStackFrames(this._stackFrames.slice(0, -1));
  }

  /**
   * Creates deep copies of all stack frames to ensure immutability.
   *
   * This private method performs a deep clone of the internal stack frames array,
   * including all nested scope objects, to prevent external mutation of the internal state.
   *
   * @returns A deep copy of the current stack frames with all nested objects cloned
   */
  private cloneFrames(stackFrames: StackFrame[]): StackFrame[] {
    return stackFrames.map((frame) => ({
      stepId: frame.stepId,
      nestedScopes: frame.nestedScopes.map((scope) => ({ ...scope })),
    }));
  }
}
