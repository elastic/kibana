/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ObservableLike, UnwrapObservable } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { Executor } from '../executor';
import type { ExecutionContainer } from './container';
import type { ExpressionValueError } from '../expression_types/specs/error';
import type {
  ExpressionAstArgument,
  ExpressionAstExpression,
  ExpressionAstFunction,
  ExpressionAstNode,
} from '../ast';
import type { DefaultInspectorAdapters, ExecutionContext } from './types';
import type { ExpressionFunction, ExpressionFunctionParameter } from '../expression_functions';
import type { ExecutionContract } from './execution_contract';
import type { ExpressionExecutionParams } from '../service';
type UnwrapReturnType<Function extends (...args: any[]) => unknown> =
  ReturnType<Function> extends ObservableLike<unknown>
    ? UnwrapObservable<ReturnType<Function>>
    : Awaited<ReturnType<Function>>;
export interface FunctionCacheItem {
  value: unknown;
  time: number;
  sideEffectFn?: () => void;
}
/**
 * The result returned after an expression function execution.
 */
export interface ExecutionResult<Output> {
  /**
   * Partial result flag.
   */
  partial: boolean;
  /**
   * The expression function result.
   */
  result: Output;
}
export interface ExecutionParams {
  executor: Executor;
  ast?: ExpressionAstExpression;
  expression?: string;
  params: ExpressionExecutionParams;
}
export declare class Execution<
  Input = unknown,
  Output = unknown,
  InspectorAdapters extends Adapters = ExpressionExecutionParams['inspectorAdapters'] extends object
    ? ExpressionExecutionParams['inspectorAdapters']
    : DefaultInspectorAdapters
> {
  #private;
  readonly execution: ExecutionParams;
  private readonly logger?;
  private readonly functionCache;
  /**
   * Dynamic state of the execution.
   */
  readonly state: ExecutionContainer<ExecutionResult<Output | ExpressionValueError>>;
  /**
   * Initial input of the execution.
   *
   * N.B. It is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  input: Input;
  /**
   * Input of the started execution.
   */
  private input$;
  /**
   * Execution context - object that allows to do side-effects. Context is passed
   * to every function.
   */
  readonly context: ExecutionContext<InspectorAdapters>;
  /**
   * AbortController to cancel this Execution.
   */
  private readonly abortController;
  /**
   * Whether .start() method has been called.
   */
  private hasStarted;
  /**
   * Future that tracks result or error of this execution.
   */
  readonly result: Observable<ExecutionResult<Output | ExpressionValueError>>;
  /**
   * Keeping track of any child executions
   * Needed to cancel child executions in case parent execution is canceled
   * @internal
   */
  private readonly childExecutions;
  private cacheTimeout;
  /**
   * Contract is a public representation of `Execution` instances. Contract we
   * can return to other plugins for their consumption.
   */
  readonly contract: ExecutionContract<Input, Output, InspectorAdapters>;
  readonly expression: string;
  get inspectorAdapters(): InspectorAdapters;
  constructor(
    execution: ExecutionParams,
    logger?: Logger | undefined,
    functionCache?: Map<string, FunctionCacheItem>
  );
  /**
   * Stop execution of expression.
   */
  cancel(reason?: AbortReason): void;
  /**
   * Call this method to start execution.
   *
   * N.B. `input` is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  start(
    input?: Input,
    isSubExpression?: boolean
  ): Observable<ExecutionResult<Output | ExpressionValueError>>;
  invokeChain<ChainOutput = unknown>(
    [head, ...tail]: ExpressionAstFunction[],
    input: unknown
  ): Observable<ChainOutput | ExpressionValueError>;
  invokeFunction<Fn extends ExpressionFunction>(
    fn: Fn,
    input: unknown,
    args: Record<string, unknown>
  ): Observable<UnwrapReturnType<Fn['fn']>>;
  cast<Type = unknown>(value: unknown, toTypeNames?: string[]): Type;
  validate<Type = unknown>(value: Type, argDef: ExpressionFunctionParameter<Type>): void;
  resolveArgs<Fn extends ExpressionFunction>(
    fnDef: Fn,
    input: unknown,
    argAsts: Record<string, ExpressionAstArgument[]>
  ): Observable<Record<string, unknown> | ExpressionValueError>;
  interpret<T>(ast: ExpressionAstNode, input: T): Observable<ExecutionResult<unknown>>;
}
export {};
