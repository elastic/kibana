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

// @ts-ignore
import { fromExpression, getByAlias } from '@kbn/interpreter/common';

import { clone, each, keys, last, mapValues, reduce, zipObject } from 'lodash';
import { createError } from './create_error';
import {
  ExpressionAST,
  ExpressionFunctionAST,
  AnyExpressionFunction,
  ArgumentType,
} from '../common/types';
import { getType } from '../common/type';
import { FunctionsRegistry } from './registries';

export { createError };

export interface InterpreterConfig {
  functions: FunctionsRegistry;
  types: any;
  handlers: any;
}

export type ExpressionInterpret = (ast: ExpressionAST, context?: any) => any;

export function interpreterProvider(config: InterpreterConfig): ExpressionInterpret {
  const { functions, types } = config;
  const handlers = { ...config.handlers, types };

  function cast(node: any, toTypeNames: any) {
    // If you don't give us anything to cast to, you'll get your input back
    if (!toTypeNames || toTypeNames.length === 0) return node;

    // No need to cast if node is already one of the valid types
    const fromTypeName = getType(node);
    if (toTypeNames.includes(fromTypeName)) return node;

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

  async function invokeChain(chainArr: ExpressionFunctionAST[], context: any): Promise<any> {
    if (!chainArr.length) return context;
    // if execution was aborted return error
    if (handlers.abortSignal && handlers.abortSignal.aborted) {
      return createError({
        message: 'The expression was aborted.',
        name: 'AbortError',
      });
    }
    const chain = clone(chainArr);
    const link = chain.shift(); // Every thing in the chain will always be a function right?
    if (!link) throw Error('Function chain is empty.');
    const { function: fnName, arguments: fnArgs } = link;
    const fnDef = getByAlias(functions.toJS(), fnName);

    if (!fnDef) {
      return createError({ message: `Function ${fnName} could not be found.` });
    }

    try {
      // Resolve arguments before passing to function
      // resolveArgs returns an object because the arguments themselves might
      // actually have a 'then' function which would be treated as a promise
      const { resolvedArgs } = await resolveArgs(fnDef, context, fnArgs);
      const newContext = await invokeFunction(fnDef, context, resolvedArgs);

      // if something failed, just return the failure
      if (getType(newContext) === 'error') return newContext;

      // Continue re-invoking chain until it's empty
      return invokeChain(chain, newContext);
    } catch (e) {
      // Everything that throws from a function will hit this
      // The interpreter should *never* fail. It should always return a `{type: error}` on failure
      e.message = `[${fnName}] > ${e.message}`;
      return createError(e);
    }
  }

  async function invokeFunction(
    fnDef: AnyExpressionFunction,
    context: any,
    args: Record<string, unknown>
  ): Promise<any> {
    // Check function input.
    const acceptableContext = cast(context, fnDef.context ? fnDef.context.types : undefined);
    const fnOutput = await fnDef.fn(acceptableContext, args, handlers);

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
    const type = handlers.types[fnDef.type];
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
  async function resolveArgs(
    fnDef: AnyExpressionFunction,
    context: any,
    argAsts: any
  ): Promise<any> {
    const argDefs = fnDef.args;

    // Use the non-alias name from the argument definition
    const dealiasedArgAsts = reduce(
      argAsts,
      (acc, argAst, argName) => {
        const argDef = getByAlias(argDefs, argName);
        // TODO: Implement a system to allow for undeclared arguments
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
          const errorArg = argName === '_' ? aliases[0] : argName; // use an alias if _ is the missing arg
          throw new Error(`${fnDef.name} requires an "${errorArg}" argument`);
        }
      }
    });

    // Fill in default values from argument definition
    const argAstsWithDefaults = reduce(
      argDefs,
      (acc: any, argDef: any, argName: any) => {
        if (typeof acc[argName] === 'undefined' && typeof argDef.default !== 'undefined') {
          acc[argName] = [(fromExpression as any)(argDef.default, 'argument')];
        }

        return acc;
      },
      dealiasedArgAsts
    );

    // Create the functions to resolve the argument ASTs into values
    // These are what are passed to the actual functions if you opt out of resolving
    const resolveArgFns = mapValues(argAstsWithDefaults, (asts, argName) => {
      return asts.map((item: any) => {
        return async (ctx = context) => {
          const newContext = await interpret(item, ctx);
          // This is why when any sub-expression errors, the entire thing errors
          if (getType(newContext) === 'error') throw newContext.error;
          return cast(newContext, argDefs[argName as any].types);
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

  const interpret: ExpressionInterpret = async function interpret(ast, context = null) {
    const type = getType(ast);
    switch (type) {
      case 'expression':
        return invokeChain(ast.chain, context);
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return ast;
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(ast)}`);
    }
  };

  return interpret;
}
