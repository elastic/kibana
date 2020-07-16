/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { keys, last, mapValues, reduce, zipObject } from 'lodash';
import { Executor, ExpressionExecOptions } from '../executor';
import { createExecutionContainer, ExecutionContainer } from './container';
import { createError } from '../util';
import { Defer, now } from '../../../kibana_utils/common';
import { toPromise } from '../../../data/common/utils/abort_utils';
import { RequestAdapter, DataAdapter } from '../../../inspector/common';
import { isExpressionValueError, ExpressionValueError } from '../expression_types/specs/error';
import {
  ExpressionAstExpression,
  ExpressionAstFunction,
  parse,
  formatExpression,
  parseExpression,
  ExpressionAstNode,
} from '../ast';
import { ExecutionContext, DefaultInspectorAdapters } from './types';
import { getType, ExpressionValue } from '../expression_types';
import { ArgumentType, ExpressionFunction } from '../expression_functions';
import { getByAlias } from '../util/get_by_alias';
import { ExecutionContract } from './execution_contract';

const createAbortErrorValue = () =>
  createError({
    message: 'The expression was aborted.',
    name: 'AbortError',
  });

export interface ExecutionParams<
  ExtraContext extends Record<string, unknown> = Record<string, unknown>
> {
  executor: Executor<any>;
  ast?: ExpressionAstExpression;
  expression?: string;
  context?: ExtraContext;

  /**
   * Whether to execute expression in *debug mode*. In *debug mode* inputs and
   * outputs as well as all resolved arguments and time it took to execute each
   * function are saved and are available for introspection.
   */
  debug?: boolean;
}

const createDefaultInspectorAdapters = (): DefaultInspectorAdapters => ({
  requests: new RequestAdapter(),
  data: new DataAdapter(),
});

export class Execution<
  ExtraContext extends Record<string, unknown> = Record<string, unknown>,
  Input = unknown,
  Output = unknown,
  InspectorAdapters = ExtraContext['inspectorAdapters'] extends object
    ? ExtraContext['inspectorAdapters']
    : DefaultInspectorAdapters
> {
  /**
   * Dynamic state of the execution.
   */
  public readonly state: ExecutionContainer<Output | ExpressionValueError>;

  /**
   * Initial input of the execution.
   *
   * N.B. It is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  public input: Input = null as any;

  /**
   * Execution context - object that allows to do side-effects. Context is passed
   * to every function.
   */
  public readonly context: ExecutionContext<Input, InspectorAdapters> & ExtraContext;

  /**
   * AbortController to cancel this Execution.
   */
  private readonly abortController = new AbortController();

  /**
   * Promise that rejects if/when abort controller sends "abort" signal.
   */
  private readonly abortRejection = toPromise(this.abortController.signal);

  /**
   * Races a given promise against the "abort" event of `abortController`.
   */
  private race<T>(promise: Promise<T>): Promise<T> {
    return Promise.race<T>([this.abortRejection, promise]);
  }

  /**
   * Whether .start() method has been called.
   */
  private hasStarted: boolean = false;

  /**
   * Future that tracks result or error of this execution.
   */
  private readonly firstResultFuture = new Defer<Output | ExpressionValueError>();

  /**
   * Contract is a public representation of `Execution` instances. Contract we
   * can return to other plugins for their consumption.
   */
  public readonly contract: ExecutionContract<
    ExtraContext,
    Input,
    Output,
    InspectorAdapters
  > = new ExecutionContract<ExtraContext, Input, Output, InspectorAdapters>(this);

  public readonly expression: string;

  public get result(): Promise<Output | ExpressionValueError> {
    return this.firstResultFuture.promise;
  }

  public get inspectorAdapters(): InspectorAdapters {
    return this.context.inspectorAdapters;
  }

  constructor(public readonly params: ExecutionParams<ExtraContext>) {
    const { executor } = params;

    if (!params.ast && !params.expression) {
      throw new TypeError('Execution params should contain at least .ast or .expression key.');
    } else if (params.ast && params.expression) {
      throw new TypeError('Execution params cannot contain both .ast and .expression key.');
    }

    this.expression = params.expression || formatExpression(params.ast!);
    const ast = params.ast || parseExpression(this.expression);

    this.state = createExecutionContainer<Output | ExpressionValueError>({
      ...executor.state.get(),
      state: 'not-started',
      ast,
    });

    this.context = {
      getInitialInput: () => this.input,
      variables: {},
      types: executor.getTypes(),
      abortSignal: this.abortController.signal,
      ...(params.context || ({} as ExtraContext)),
      inspectorAdapters: (params.context && params.context.inspectorAdapters
        ? params.context.inspectorAdapters
        : createDefaultInspectorAdapters()) as InspectorAdapters,
    };
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
  public start(input: Input = null as any) {
    if (this.hasStarted) throw new Error('Execution already started.');
    this.hasStarted = true;

    this.input = input;
    this.state.transitions.start();

    const { resolve, reject } = this.firstResultFuture;
    const chainPromise = this.invokeChain(this.state.get().ast.chain, input);

    this.race(chainPromise).then(resolve, (error) => {
      if (this.abortController.signal.aborted) resolve(createAbortErrorValue());
      else reject(error);
    });

    this.firstResultFuture.promise.then(
      (result) => {
        this.state.transitions.setResult(result);
      },
      (error) => {
        this.state.transitions.setError(error);
      }
    );
  }

  async invokeChain(chainArr: ExpressionAstFunction[], input: unknown): Promise<any> {
    if (!chainArr.length) return input;

    for (const link of chainArr) {
      const { function: fnName, arguments: fnArgs } = link;
      const fn = getByAlias(this.state.get().functions, fnName);

      if (!fn) {
        return createError({ message: `Function ${fnName} could not be found.` });
      }

      let args: Record<string, ExpressionValue> = {};
      let timeStart: number | undefined;

      try {
        // `resolveArgs` returns an object because the arguments themselves might
        // actually have a `then` function which would be treated as a `Promise`.
        const { resolvedArgs } = await this.race(this.resolveArgs(fn, input, fnArgs));
        args = resolvedArgs;
        timeStart = this.params.debug ? now() : 0;
        const output = await this.race(this.invokeFunction(fn, input, resolvedArgs));

        if (this.params.debug) {
          const timeEnd: number = now();
          (link as ExpressionAstFunction).debug = {
            success: true,
            fn,
            input,
            args: resolvedArgs,
            output,
            duration: timeEnd - timeStart,
          };
        }

        if (getType(output) === 'error') return output;
        input = output;
      } catch (rawError) {
        const timeEnd: number = this.params.debug ? now() : 0;
        const error = createError(rawError) as ExpressionValueError;
        error.error.message = `[${fnName}] > ${error.error.message}`;

        if (this.params.debug) {
          (link as ExpressionAstFunction).debug = {
            success: false,
            fn,
            input,
            args,
            error,
            rawError,
            duration: timeStart ? timeEnd - timeStart : undefined,
          };
        }

        return error;
      }
    }

    return input;
  }

  async invokeFunction(
    fn: ExpressionFunction,
    input: unknown,
    args: Record<string, unknown>
  ): Promise<any> {
    const normalizedInput = this.cast(input, fn.inputTypes);
    const output = await this.race(fn.fn(normalizedInput, args, this.context));

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
  }

  public cast(value: any, toTypeNames?: string[]) {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames || toTypeNames.length === 0) return value;

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(value);
    if (toTypeNames.includes(fromTypeName)) return value;

    const { types } = this.state.get();
    const fromTypeDef = types[fromTypeName];

    for (const toTypeName of toTypeNames) {
      // First check if the current type can cast to this type
      if (fromTypeDef && fromTypeDef.castsTo(toTypeName)) {
        return fromTypeDef.to(value, toTypeName, types);
      }

      // If that isn't possible, check if this type can cast from the current type
      const toTypeDef = types[toTypeName];
      if (toTypeDef && toTypeDef.castsFrom(fromTypeName)) return toTypeDef.from(value, types);
    }

    throw new Error(`Can not cast '${fromTypeName}' to any of '${toTypeNames.join(', ')}'`);
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  async resolveArgs(fnDef: ExpressionFunction, input: unknown, argAsts: any): Promise<any> {
    const argDefs = fnDef.args;

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
      {} as any
    );

    // Check for missing required arguments.
    for (const argDef of Object.values(argDefs)) {
      const { aliases, default: argDefault, name: argName, required } = argDef as ArgumentType<
        any
      > & { name: string };
      if (
        typeof argDefault !== 'undefined' ||
        !required ||
        typeof dealiasedArgAsts[argName] !== 'undefined'
      )
        continue;

      if (!aliases || aliases.length === 0) {
        throw new Error(`${fnDef.name} requires an argument`);
      }

      // use an alias if _ is the missing arg
      const errorArg = argName === '_' ? aliases[0] : argName;
      throw new Error(`${fnDef.name} requires an "${errorArg}" argument`);
    }

    // Fill in default values from argument definition
    const argAstsWithDefaults = reduce(
      argDefs,
      (acc: any, argDef: any, argName: any) => {
        if (typeof acc[argName] === 'undefined' && typeof argDef.default !== 'undefined') {
          acc[argName] = [parse(argDef.default, 'argument')];
        }

        return acc;
      },
      dealiasedArgAsts
    );

    // Create the functions to resolve the argument ASTs into values
    // These are what are passed to the actual functions if you opt out of resolving
    const resolveArgFns = mapValues(argAstsWithDefaults, (asts, argName) => {
      return asts.map((item: ExpressionAstExpression) => {
        return async (subInput = input) => {
          const output = await this.interpret(item, subInput, {
            debug: this.params.debug,
          });
          if (isExpressionValueError(output)) throw output.error;
          const casted = this.cast(output, argDefs[argName as any].types);
          return casted;
        };
      });
    });

    const argNames = keys(resolveArgFns);

    // Actually resolve unless the argument definition says not to
    const resolvedArgValues = await Promise.all(
      argNames.map((argName) => {
        const interpretFns = resolveArgFns[argName];
        if (!argDefs[argName].resolve) return interpretFns;
        return Promise.all(interpretFns.map((fn: any) => fn()));
      })
    );

    const resolvedMultiArgs = zipObject(argNames, resolvedArgValues);

    // Just return the last unless the argument definition allows multiple
    const resolvedArgs = mapValues(resolvedMultiArgs, (argValues, argName) => {
      if (argDefs[argName as any].multi) return argValues;
      return last(argValues as any);
    });

    // Return an object here because the arguments themselves might actually have a 'then'
    // function which would be treated as a promise
    return { resolvedArgs };
  }

  public async interpret<T>(
    ast: ExpressionAstNode,
    input: T,
    options?: ExpressionExecOptions
  ): Promise<unknown> {
    switch (getType(ast)) {
      case 'expression':
        const execution = this.params.executor.createExecution(
          ast as ExpressionAstExpression,
          this.context,
          options
        );
        execution.start(input);
        return await execution.result;
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return ast;
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(ast)}`);
    }
  }
}
