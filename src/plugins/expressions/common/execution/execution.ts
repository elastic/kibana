/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isPromise } from '@kbn/std';
import { ObservableLike, UnwrapObservable } from '@kbn/utility-types';
import { keys, last, mapValues, reduce, zipObject } from 'lodash';
import {
  combineLatest,
  defer,
  from,
  isObservable,
  of,
  throwError,
  Observable,
  ReplaySubject,
} from 'rxjs';
import { catchError, finalize, map, pluck, shareReplay, switchMap, tap } from 'rxjs/operators';
import { now, AbortError } from '@kbn/kibana-utils-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import { Executor } from '../executor';
import { createExecutionContainer, ExecutionContainer } from './container';
import { createError } from '../util';
import { isExpressionValueError, ExpressionValueError } from '../expression_types/specs/error';
import {
  ExpressionAstArgument,
  ExpressionAstExpression,
  ExpressionAstFunction,
  parse,
  formatExpression,
  parseExpression,
  ExpressionAstNode,
} from '../ast';
import { ExecutionContext, DefaultInspectorAdapters } from './types';
import { getType, Datatable } from '../expression_types';
import type { ExpressionFunction, ExpressionFunctionParameter } from '../expression_functions';
import { getByAlias } from '../util/get_by_alias';
import { ExecutionContract } from './execution_contract';
import { ExpressionExecutionParams } from '../service';
import { createDefaultInspectorAdapters } from '../util/create_default_inspector_adapters';

type UnwrapReturnType<Function extends (...args: any[]) => unknown> =
  ReturnType<Function> extends ObservableLike<unknown>
    ? UnwrapObservable<ReturnType<Function>>
    : Awaited<ReturnType<Function>>;

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

const createAbortErrorValue = () =>
  createError({
    message: 'The expression was aborted.',
    name: 'AbortError',
  });

function markPartial<T>() {
  return (source: Observable<T>) =>
    new Observable<ExecutionResult<T>>((subscriber) => {
      let latest: ExecutionResult<T> | undefined;

      subscriber.add(
        source.subscribe({
          next: (result) => {
            latest = { result, partial: true };
            subscriber.next(latest);
          },
          error: (error) => subscriber.error(error),
          complete: () => {
            if (latest) {
              latest.partial = false;
            }

            subscriber.complete();
          },
        })
      );

      subscriber.add(() => {
        latest = undefined;
      });
    });
}

function takeUntilAborted<T>(signal: AbortSignal) {
  return (source: Observable<T>) =>
    new Observable<T>((subscriber) => {
      const throwAbortError = () => {
        subscriber.error(new AbortError());
      };

      subscriber.add(source.subscribe(subscriber));
      subscriber.add(() => signal.removeEventListener('abort', throwAbortError));

      signal.addEventListener('abort', throwAbortError);
      if (signal.aborted) {
        throwAbortError();
      }
    });
}

export interface ExecutionParams {
  executor: Executor;
  ast?: ExpressionAstExpression;
  expression?: string;
  params: ExpressionExecutionParams;
}

export class Execution<
  Input = unknown,
  Output = unknown,
  InspectorAdapters extends Adapters = ExpressionExecutionParams['inspectorAdapters'] extends object
    ? ExpressionExecutionParams['inspectorAdapters']
    : DefaultInspectorAdapters
> {
  /**
   * Dynamic state of the execution.
   */
  public readonly state: ExecutionContainer<ExecutionResult<Output | ExpressionValueError>>;

  /**
   * Initial input of the execution.
   *
   * N.B. It is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  public input = null as unknown as Input;

  /**
   * Input of the started execution.
   */
  private input$ = new ReplaySubject<Input>(1);

  /**
   * Execution context - object that allows to do side-effects. Context is passed
   * to every function.
   */
  public readonly context: ExecutionContext<InspectorAdapters>;

  /**
   * AbortController to cancel this Execution.
   */
  private readonly abortController = new AbortController();

  /**
   * Whether .start() method has been called.
   */
  private hasStarted: boolean = false;

  /**
   * Future that tracks result or error of this execution.
   */
  public readonly result: Observable<ExecutionResult<Output | ExpressionValueError>>;

  /**
   * Keeping track of any child executions
   * Needed to cancel child executions in case parent execution is canceled
   * @private
   */
  private readonly childExecutions: Execution[] = [];

  /**
   * Contract is a public representation of `Execution` instances. Contract we
   * can return to other plugins for their consumption.
   */
  public readonly contract: ExecutionContract<Input, Output, InspectorAdapters>;

  public readonly expression: string;

  public get inspectorAdapters(): InspectorAdapters {
    return this.context.inspectorAdapters;
  }

  constructor(public readonly execution: ExecutionParams) {
    const { executor } = execution;

    this.contract = new ExecutionContract<Input, Output, InspectorAdapters>(this);

    if (!execution.ast && !execution.expression) {
      throw new TypeError('Execution params should contain at least .ast or .expression key.');
    } else if (execution.ast && execution.expression) {
      throw new TypeError('Execution params cannot contain both .ast and .expression key.');
    }

    this.expression = execution.expression || formatExpression(execution.ast!);
    const ast = execution.ast || parseExpression(this.expression);

    this.state = createExecutionContainer({
      ...executor.state,
      state: 'not-started',
      ast,
    });

    const inspectorAdapters =
      (execution.params.inspectorAdapters as InspectorAdapters) || createDefaultInspectorAdapters();

    this.context = {
      getSearchContext: () => this.execution.params.searchContext || {},
      getSearchSessionId: () => execution.params.searchSessionId,
      getKibanaRequest: execution.params.kibanaRequest
        ? () => execution.params.kibanaRequest!
        : undefined,
      variables: execution.params.variables || {},
      types: executor.getTypes(),
      abortSignal: this.abortController.signal,
      inspectorAdapters,
      logDatatable: (name: string, datatable: Datatable) => {
        inspectorAdapters.tables[name] = datatable;
      },
      isSyncColorsEnabled: () => execution.params.syncColors!,
      isSyncTooltipsEnabled: () => execution.params.syncTooltips!,
      ...execution.executor.context,
      getExecutionContext: () => execution.params.executionContext,
    };

    this.result = this.input$.pipe(
      switchMap((input) =>
        this.invokeChain<Output>(this.state.get().ast.chain, input).pipe(
          takeUntilAborted(this.abortController.signal),
          markPartial()
        )
      ),
      catchError((error) => {
        if (this.abortController.signal.aborted) {
          this.childExecutions.forEach((childExecution) => childExecution.cancel());

          return of({ result: createAbortErrorValue(), partial: false });
        }

        return throwError(error);
      }),
      tap({
        next: (result) => {
          this.context.inspectorAdapters.expression?.logAST(this.state.get().ast);
          this.state.transitions.setResult(result);
        },
        error: (error) => this.state.transitions.setError(error),
      }),
      shareReplay(1)
    );
  }

  /**
   * Stop execution of expression.
   */
  cancel() {
    this.abortController.abort();
  }

  /**
   * Call this method to start execution.
   *
   * N.B. `input` is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  start(
    input = null as unknown as Input,
    isSubExpression?: boolean
  ): Observable<ExecutionResult<Output | ExpressionValueError>> {
    if (this.hasStarted) throw new Error('Execution already started.');
    this.hasStarted = true;
    this.input = input;
    this.state.transitions.start();

    if (!isSubExpression) {
      this.context.inspectorAdapters.requests?.reset();
    }

    if (isObservable(input)) {
      (input as Observable<Input>).subscribe(this.input$);
    } else if (isPromise(input)) {
      from(input).subscribe(this.input$);
    } else {
      of(input).subscribe(this.input$);
    }

    return this.result;
  }

  invokeChain<ChainOutput = unknown>(
    chainArr: ExpressionAstFunction[],
    input: unknown
  ): Observable<ChainOutput> {
    return of(input).pipe(
      ...(chainArr.map((link) =>
        switchMap((currentInput) => {
          const { function: fnName, arguments: fnArgs } = link;
          const fn = getByAlias(
            this.state.get().functions,
            fnName,
            this.execution.params.namespace
          );

          if (!fn) {
            throw createError({
              name: 'fn not found',
              message: i18n.translate('expressions.execution.functionNotFound', {
                defaultMessage: `Function {fnName} could not be found.`,
                values: {
                  fnName,
                },
              }),
            });
          }

          if (fn.disabled) {
            throw createError({
              name: 'fn is disabled',
              message: i18n.translate('expressions.execution.functionDisabled', {
                defaultMessage: `Function {fnName} is disabled.`,
                values: {
                  fnName,
                },
              }),
            });
          }

          if (this.execution.params.debug) {
            link.debug = {
              args: {},
              duration: 0,
              fn: fn.name,
              input: currentInput,
              success: true,
            };
          }

          const timeStart = this.execution.params.debug ? now() : 0;

          // `resolveArgs` returns an object because the arguments themselves might
          // actually have `then` or `subscribe` methods which would be treated as a `Promise`
          // or an `Observable` accordingly.
          return this.resolveArgs(fn, currentInput, fnArgs).pipe(
            tap((args) => this.execution.params.debug && Object.assign(link.debug, { args })),
            switchMap((args) => this.invokeFunction(fn, currentInput, args)),
            switchMap((output) => (getType(output) === 'error' ? throwError(output) : of(output))),
            tap((output) => this.execution.params.debug && Object.assign(link.debug, { output })),
            catchError((rawError) => {
              const error = createError(rawError);
              error.error.message = `[${fnName}] > ${error.error.message}`;

              if (this.execution.params.debug) {
                Object.assign(link.debug, { error, rawError, success: false });
              }

              return throwError(error);
            }),
            finalize(() => {
              if (this.execution.params.debug) {
                Object.assign(link.debug, { duration: now() - timeStart });
              }
            })
          );
        })
      ) as Parameters<Observable<unknown>['pipe']>),
      catchError((error) => of(error))
    ) as Observable<ChainOutput>;
  }

  invokeFunction<Fn extends ExpressionFunction>(
    fn: Fn,
    input: unknown,
    args: Record<string, unknown>
  ): Observable<UnwrapReturnType<Fn['fn']>> {
    return of(input).pipe(
      map((currentInput) => this.cast(currentInput, fn.inputTypes)),
      switchMap((normalizedInput) => of(fn.fn(normalizedInput, args, this.context))),
      switchMap(
        (fnResult) =>
          (isObservable(fnResult)
            ? fnResult
            : from(isPromise(fnResult) ? fnResult : [fnResult])) as Observable<
            UnwrapReturnType<Fn['fn']>
          >
      ),
      map((output) => {
        // Validate that the function returned the type it said it would.
        // This isn't required, but it keeps function developers honest.
        const returnType = getType(output);
        const expectedType = fn.type;
        if (expectedType && returnType !== expectedType) {
          throw new Error(
            `Function '${fn.name}' should return '${expectedType}',` +
              ` actually returned '${returnType}'`
          );
        }

        // Validate the function output against the type definition's validate function.
        const type = this.context.types[fn.type];
        if (type && type.validate) {
          try {
            type.validate(output);
          } catch (e) {
            throw new Error(`Output of '${fn.name}' is not a valid type '${fn.type}': ${e}`);
          }
        }

        return output;
      })
    );
  }

  public cast<Type = unknown>(value: unknown, toTypeNames?: string[]): Type {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames?.length) {
      return value as Type;
    }

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(value);
    if (toTypeNames.includes(fromTypeName)) {
      return value as Type;
    }

    const { types } = this.state.get();
    const fromTypeDef = types[fromTypeName];

    for (const toTypeName of toTypeNames) {
      // First check if the current type can cast to this type
      if (fromTypeDef?.castsTo(toTypeName)) {
        return fromTypeDef.to(value, toTypeName, types);
      }

      // If that isn't possible, check if this type can cast from the current type
      const toTypeDef = types[toTypeName];
      if (toTypeDef?.castsFrom(fromTypeName)) {
        return toTypeDef.from(value, types);
      }
    }

    throw new Error(`Can not cast '${fromTypeName}' to any of '${toTypeNames.join(', ')}'`);
  }

  validate<Type = unknown>(value: Type, argDef: ExpressionFunctionParameter<Type>): void {
    if (argDef.strict && argDef.options?.length && !argDef.options.includes(value)) {
      throw new Error(
        `Value '${value}' is not among the allowed options for argument '${
          argDef.name
        }': '${argDef.options.join("', '")}'`
      );
    }
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  resolveArgs<Fn extends ExpressionFunction>(
    fnDef: Fn,
    input: unknown,
    argAsts: Record<string, ExpressionAstArgument[]>
  ): Observable<Record<string, unknown>> {
    return defer(() => {
      const { args: argDefs } = fnDef;

      // Use the non-alias name from the argument definition
      const dealiasedArgAsts = reduce(
        argAsts,
        (acc, argAst, argName) => {
          const argDef = getByAlias(argDefs, argName);
          if (!argDef) {
            throw new Error(`Unknown argument '${argName}' passed to function '${fnDef.name}'`);
          }
          acc[argDef.name] = (acc[argDef.name] || []).concat(argAst);
          return acc;
        },
        {} as Record<string, ExpressionAstArgument[]>
      );

      // Check for missing required arguments.
      for (const { aliases, default: argDefault, name, required } of Object.values(argDefs)) {
        if (!(name in dealiasedArgAsts) && typeof argDefault !== 'undefined') {
          dealiasedArgAsts[name] = [parse(argDefault as string, 'argument')];
        }

        if (!required || name in dealiasedArgAsts) {
          continue;
        }

        if (!aliases?.length) {
          throw new Error(`${fnDef.name} requires an argument`);
        }

        // use an alias if _ is the missing arg
        const errorArg = name === '_' ? aliases[0] : name;
        throw new Error(`${fnDef.name} requires an "${errorArg}" argument`);
      }

      // Create the functions to resolve the argument ASTs into values
      // These are what are passed to the actual functions if you opt out of resolving
      const resolveArgFns = mapValues(dealiasedArgAsts, (asts, argName) =>
        asts.map(
          (item) =>
            (subInput = input) =>
              this.interpret(item, subInput).pipe(
                pluck('result'),
                map((output) => {
                  if (isExpressionValueError(output)) {
                    throw output.error;
                  }

                  return this.cast(output, argDefs[argName].types);
                }),
                tap((value) => this.validate(value, argDefs[argName]))
              )
        )
      );

      const argNames = keys(resolveArgFns);

      if (!argNames.length) {
        return from([{}]);
      }

      const resolvedArgValuesObservable = combineLatest(
        argNames.map((argName) => {
          const interpretFns = resolveArgFns[argName];

          // `combineLatest` does not emit a value on an empty collection
          // @see https://github.com/ReactiveX/RxSwift/issues/1879
          if (!interpretFns.length) {
            return of([]);
          }

          return argDefs[argName].resolve
            ? combineLatest(interpretFns.map((fn) => fn()))
            : of(interpretFns);
        })
      );

      return resolvedArgValuesObservable.pipe(
        map((resolvedArgValues) =>
          mapValues(
            // Return an object here because the arguments themselves might actually have a 'then'
            // function which would be treated as a promise
            zipObject(argNames, resolvedArgValues),
            // Just return the last unless the argument definition allows multiple
            (argValues, argName) => (argDefs[argName].multi ? argValues : last(argValues))
          )
        )
      );
    });
  }

  interpret<T>(ast: ExpressionAstNode, input: T): Observable<ExecutionResult<unknown>> {
    switch (getType(ast)) {
      case 'expression':
        const execution = this.execution.executor.createExecution(ast as ExpressionAstExpression, {
          ...this.execution.params,
          variables: this.context.variables,
        });
        this.childExecutions.push(execution);

        return execution.start(input, true);
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return of({ result: ast, partial: false });
      default:
        return throwError(new Error(`Unknown AST object: ${JSON.stringify(ast)}`));
    }
  }
}
