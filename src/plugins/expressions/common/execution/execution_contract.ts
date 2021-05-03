/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
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
    return this.execution.result
      .pipe(
        take(1),
        catchError(({ name, message, stack }) =>
          of({
            type: 'error',
            error: {
              name,
              message,
              stack,
            },
          } as ExpressionValueError)
        )
      )
      .toPromise();
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
