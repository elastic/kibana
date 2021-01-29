/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Execution } from './execution';
import { ExpressionValueError } from '../expression_types/specs';
import { ExpressionAstExpression } from '../ast';

/**
 * `ExecutionContract` is a wrapper around `Execution` class. It provides the
 * same functionality but does not expose Expressions plugin internals.
 */
export class ExecutionContract<Input = unknown, Output = unknown, InspectorAdapters = unknown> {
  public get isPending(): boolean {
    const state = this.execution.state.get().state;
    const finished = state === 'error' || state === 'result';
    return !finished;
  }

  constructor(protected readonly execution: Execution<Input, Output, InspectorAdapters>) {}

  /**
   * Cancel the execution of the expression. This will set abort signal
   * (available in execution context) to aborted state, letting expression
   * functions to stop their execution.
   */
  cancel = () => {
    this.execution.cancel();
  };

  /**
   * Returns the final output of expression, if any error happens still
   * wraps that error into `ExpressionValueError` type and returns that.
   * This function never throws.
   */
  getData = async (): Promise<Output | ExpressionValueError> => {
    try {
      return await this.execution.result;
    } catch (e) {
      return {
        type: 'error',
        error: {
          name: e.name,
          message: e.message,
          stack: e.stack,
        },
      };
    }
  };

  /**
   * Get string representation of the expression. Returns the original string
   * if execution was started from a string. If execution was started from an
   * AST this method returns a string generated from AST.
   */
  getExpression = () => {
    return this.execution.expression;
  };

  /**
   * Get AST used to execute the expression.
   */
  getAst = (): ExpressionAstExpression => this.execution.state.get().ast;

  /**
   * Get Inspector adapters provided to all functions of expression through
   * execution context.
   */
  inspect = () => this.execution.inspectorAdapters;
}
