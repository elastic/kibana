/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { Execution, ExecutionResult } from './execution';
import type { ExpressionValueError } from '../expression_types/specs';
import type { ExpressionAstExpression } from '../ast';
/**
 * `ExecutionContract` is a wrapper around `Execution` class. It provides the
 * same functionality but does not expose Expressions plugin internals.
 */
export declare class ExecutionContract<
  Input = unknown,
  Output = unknown,
  InspectorAdapters extends Adapters = object
> {
  get isPending(): boolean;
  protected readonly execution: Execution<Input, Output, InspectorAdapters>;
  constructor(execution: Execution<Input, Output, InspectorAdapters>);
  /**
   * Cancel the execution of the expression. This will set abort signal
   * (available in execution context) to aborted state, letting expression
   * functions to stop their execution.
   */
  cancel: (reason?: AbortReason) => void;
  /**
   * Returns the final output of expression, if any error happens still
   * wraps that error into `ExpressionValueError` type and returns that.
   * This function never throws.
   */
  getData: () => Observable<ExecutionResult<Output | ExpressionValueError>>;
  /**
   * Get string representation of the expression. Returns the original string
   * if execution was started from a string. If execution was started from an
   * AST this method returns a string generated from AST.
   */
  getExpression: () => string;
  /**
   * Get AST used to execute the expression.
   */
  getAst: () => ExpressionAstExpression;
  /**
   * Get Inspector adapters provided to all functions of expression through
   * execution context.
   */
  inspect: () => Adapters;
}
