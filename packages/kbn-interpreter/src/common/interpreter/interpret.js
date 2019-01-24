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

import clone from 'lodash.clone';
import { each, keys, last, mapValues, reduce, zipObject } from 'lodash';
import { getType } from '../lib/get_type';
import { fromExpression } from '../lib/ast';
import { getByAlias } from '../lib/get_by_alias';
import { castProvider } from './cast';
import { createError } from './create_error';

export function interpretProvider(config) {
  const { functions, onFunctionNotFound, types } = config;
  const handlers = { ...config.handlers, types };
  const cast = castProvider(types);

  return interpret;

  async function interpret(node, context = null) {
    switch (getType(node)) {
      case 'expression':
        return invokeChain(node.chain, context);
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return node;
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(node)}`);
    }
  }

  async function invokeChain(chainArr, context) {
    if (!chainArr.length) return Promise.resolve(context);

    const chain = clone(chainArr);
    const link = chain.shift(); // Every thing in the chain will always be a function right?
    const { function: fnName, arguments: fnArgs } = link;
    const fnDef = getByAlias(functions, fnName);

    // if the function is not found, pass the expression chain to the not found handler
    // in this case, it will try to execute the function in another context
    if (!fnDef) {
      chain.unshift(link);
      try {
        return await onFunctionNotFound({ type: 'expression', chain: chain }, context);
      } catch (e) {
        return createError(e);
      }
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
      return await invokeChain(chain, newContext);
    } catch (e) {
      // Everything that throws from a function will hit this
      // The interpreter should *never* fail. It should always return a `{type: error}` on failure
      e.message = `[${fnName}] > ${e.message}`;
      return createError(e);
    }
  }

  async function invokeFunction(fnDef, context, args) {
    // Check function input.
    const acceptableContext = cast(context, fnDef.context.types);
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
  async function resolveArgs(fnDef, context, argAsts) {
    const argDefs = fnDef.args;

    // Use the non-alias name from the argument definition
    const dealiasedArgAsts = reduce(
      argAsts,
      (argAsts, argAst, argName) => {
        const argDef = getByAlias(argDefs, argName);
        // TODO: Implement a system to allow for undeclared arguments
        if (!argDef) {
          throw new Error(`Unknown argument '${argName}' passed to function '${fnDef.name}'`);
        }

        argAsts[argDef.name] = (argAsts[argDef.name] || []).concat(argAst);
        return argAsts;
      },
      {}
    );

    // Check for missing required arguments
    each(argDefs, argDef => {
      const { aliases, default: argDefault, name: argName, required } = argDef;
      if (
        typeof argDefault === 'undefined' &&
        required &&
        typeof dealiasedArgAsts[argName] === 'undefined'
      ) {
        if (aliases.length === 0) {
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
      (argAsts, argDef, argName) => {
        if (typeof argAsts[argName] === 'undefined' && typeof argDef.default !== 'undefined')  {
          argAsts[argName] = [fromExpression(argDef.default, 'argument')];
        }

        return argAsts;
      },
      dealiasedArgAsts
    );

    // Create the functions to resolve the argument ASTs into values
    // These are what are passed to the actual functions if you opt out of resolving
    const resolveArgFns = mapValues(argAstsWithDefaults, (argAsts, argName) => {
      return argAsts.map(argAst => {
        return async (ctx = context) => {
          const newContext = await interpret(argAst, ctx);
          // This is why when any sub-expression errors, the entire thing errors
          if (getType(newContext) === 'error') throw newContext.error;
          return cast(newContext, argDefs[argName].types);
        };
      });
    });

    const argNames = keys(resolveArgFns);

    // Actually resolve unless the argument definition says not to
    const resolvedArgValues = await Promise.all(
      argNames.map(argName => {
        const interpretFns = resolveArgFns[argName];
        if (!argDefs[argName].resolve) return interpretFns;
        return Promise.all(interpretFns.map(fn => fn()));
      })
    );

    const resolvedMultiArgs = zipObject(argNames, resolvedArgValues);

    // Just return the last unless the argument definition allows multiple
    const resolvedArgs = mapValues(resolvedMultiArgs, (argValues, argName) => {
      if (argDefs[argName].multi) return argValues;
      return last(argValues);
    });

    // Return an object here because the arguments themselves might actually have a 'then'
    // function which would be treated as a promise
    return { resolvedArgs };
  }
}
