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

import { clone, each, keys, last, mapValues, reduce, zipObject } from 'lodash';
import { Executor } from '../executor';
import { createExecutionContainer, ExecutionContainer } from './container';
import { createError } from '../util';
import { Defer } from '../../../kibana_utils/common';
import { isExpressionValueError } from '../expression_types/specs/error';
import { ExpressionAstExpression, ExpressionAstFunction } from '../parser';
import { ExecutionContext } from './types';
import { getType } from '../expression_types';
import { AnyExpressionFunctionDefinition, ArgumentType } from '../expression_functions';
import { getByAlias } from './get_by_alias';
import { parse } from '../parser/parse';

export interface ExecutionParams {
  executor: Executor;
  ast: ExpressionAstExpression;
}

export class Execution {
  /**
   * Dynamic state of the execution.
   */
  state: ExecutionContainer;

  /**
   * Initial input of the execution.
   *
   * N.B. It is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  input: unknown = null;

  /**
   * Execution context - object that allows to do side-effects, which is passed
   * to every function.
   */
  context: ExecutionContext;

  private hasStarted: boolean = false;
  private firstResultFuture: Defer<unknown> = new Defer<unknown>();

  public get result(): Promise<unknown> {
    return this.firstResultFuture.promise;
  }

  constructor(public readonly params: ExecutionParams) {
    const { executor, ast } = params;
    this.state = createExecutionContainer({
      ...executor.state.get(),
      ast,
    });
    this.context = {
      ...executor.context,
      getInitialInput: () => this.input,
      getInitialContext: () => this.input,
      variables: {},
      types: executor.getTypes(),
    };
  }

  /**
   * Call this method to start execution.
   *
   * N.B. `input` is initialized to `null` rather than `undefined` for legacy reasons,
   * because in legacy interpreter it was set to `null` by default.
   */
  public start(input: unknown = null) {
    if (!this.hasStarted) throw new Error('Execution already started.');
    this.hasStarted = true;

    this.input = input;
    const { resolve, reject } = this.firstResultFuture;
    this.invokeChain(this.state.get().ast.chain, input).then(resolve, reject);
  }

  public cast(node: any, toTypeNames: any) {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames || toTypeNames.length === 0) return node;

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(node);
    if (toTypeNames.includes(fromTypeName)) return node;

    const { types } = this.state.get();
    const fromTypeDef = types[fromTypeName];

    for (let i = 0; i < toTypeNames.length; i++) {
      // First check if the current type can cast to this type
      if (fromTypeDef && fromTypeDef.castsTo(toTypeNames[i])) {
        return fromTypeDef.to(node, toTypeNames[i], types);
      }

      // If that isn't possible, check if this type can cast from the current type
      const toTypeDef = types[toTypeNames[i]];
      if (toTypeDef && toTypeDef.castsFrom(fromTypeName)) return toTypeDef.from(node, types);
    }

    throw new Error(`Can not cast '${fromTypeName}' to any of '${toTypeNames.join(', ')}'`);
  }

  async invokeFunction(
    fnDef: AnyExpressionFunctionDefinition,
    input: unknown,
    args: Record<string, unknown>
  ): Promise<any> {
    // Check function input.
    const castedInput = this.cast(input, fnDef.context ? fnDef.context.types : undefined);
    const fnOutput = await fnDef.fn(castedInput, args, this.context);

    // Validate that the function returned the type it said it would.
    // This isn't really required, but it keeps function developers honest.
    const returnType = getType(fnOutput);
    const expectedType = fnDef.type;
    if (expectedType && returnType !== expectedType) {
      throw new Error(
        `Function '${fnDef.name}' should return '${expectedType}',` +
          ` actually returned '${returnType}'`
      );
    }

    // Validate the function output against the type definition's validate function
    const type = this.context.types[fnDef.type];
    if (type && type.validate) {
      try {
        type.validate(fnOutput);
      } catch (e) {
        throw new Error(`Output of '${fnDef.name}' is not a valid type '${fnDef.type}': ${e}`);
      }
    }

    return fnOutput;
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  async resolveArgs(
    fnDef: AnyExpressionFunctionDefinition,
    input: unknown,
    argAsts: any
  ): Promise<any> {
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

    // Check for missing required arguments
    each(argDefs, argDef => {
      const { aliases, default: argDefault, name: argName, required } = argDef as ArgumentType<
        any
      > & { name: string };
      if (
        typeof argDefault === 'undefined' &&
        required &&
        typeof dealiasedArgAsts[argName] === 'undefined'
      ) {
        if (!aliases || aliases.length === 0) {
          throw new Error(`${fnDef.name} requires an argument`);
        } else {
          // use an alias if _ is the missing arg
          const errorArg = argName === '_' ? aliases[0] : argName;
          throw new Error(`${fnDef.name} requires an "${errorArg}" argument`);
        }
      }
    });

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
          const output = await this.params.executor.interpret(item, subInput);
          // This is why when any sub-expression errors, the entire thing errors
          if (isExpressionValueError(output)) throw output.error;
          return this.cast(output, argDefs[argName as any].types);
        };
      });
    });

    const argNames = keys(resolveArgFns);

    // Actually resolve unless the argument definition says not to
    const resolvedArgValues = await Promise.all(
      argNames.map(argName => {
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

  async invokeChain(chainArr: ExpressionAstFunction[], context: any): Promise<any> {
    if (!chainArr.length) return context;
    // if execution was aborted return error
    if (this.context.abortSignal && this.context.abortSignal.aborted) {
      return createError({
        message: 'The expression was aborted.',
        name: 'AbortError',
      });
    }
    const chain = clone(chainArr);
    const link = chain.shift(); // Every thing in the chain will always be a function right?
    if (!link) throw Error('Function chain is empty.');
    const { function: fnName, arguments: fnArgs } = link;
    const fnDef = getByAlias(this.state.get().functions, fnName);

    if (!fnDef) {
      return createError({ message: `Function ${fnName} could not be found.` });
    }

    try {
      // Resolve arguments before passing to function
      // resolveArgs returns an object because the arguments themselves might
      // actually have a 'then' function which would be treated as a promise
      const { resolvedArgs } = await this.resolveArgs(fnDef, context, fnArgs);
      const newContext = await this.invokeFunction(fnDef, context, resolvedArgs);

      // if something failed, just return the failure
      if (getType(newContext) === 'error') return newContext;

      // Continue re-invoking chain until it's empty
      return this.invokeChain(chain, newContext);
    } catch (e) {
      // Everything that throws from a function will hit this
      // The interpreter should *never* fail. It should always return a `{type: error}` on failure
      e.message = `[${fnName}] > ${e.message}`;
      return createError(e);
    }
  }
}
