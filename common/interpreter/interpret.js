import { clone, each, keys, last, map, mapValues, values, zipObject, omitBy } from 'lodash';
import { castProvider } from './cast';
import { getType } from '../lib/get_type';
import { fromExpression } from '../lib/ast';
import { typesRegistry } from '../lib/types_registry';

const createError = (err, { name, context, args }) => ({
  type: 'error',
  error: {
    stack: err.stack,
    message: typeof err === 'string' ? err : err.message,
  },
  info: {
    context,
    args,
    functionName: name,
  },
});

export function interpretProvider(config) {
  const cast = castProvider(config.types);
  const { functions, onFunctionNotFound, handlers } = config;

  return interpret;

  function interpret(node, context = null) {
    switch (getType(node)) {
      case 'partial':
        return (partialContext) => invokeChain(node.chain, partialContext);
      case 'expression':
        return invokeChain(node.chain, context);
      case 'function':
        return node;
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return Promise.resolve(node);
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(node)}`);
    }
  }

  function invokeChain(chainArr, context) {
    if (!chainArr.length) return Promise.resolve(context);

    const chain = clone(chainArr);
    const link = chain.shift(); // Every thing in the chain will always be a function right?
    const { function: fnName, arguments: fnArgs } = link;

    const fnDef = functions[fnName];
    if (!fnDef) {
      chain.unshift(link);
      return onFunctionNotFound({ type: 'expression', chain: chain }, context);
    }

    // TODO: handle errors here
    return resolveArgs(fnName, context, fnArgs) // Resolve arguments before passing to function
    .then((resolvedArgs) => {
      return invokeFunction(fnName, context, resolvedArgs) // Then invoke function with resolved arguments
      .then(newContext => {
        // if something failed, just return the failure
        if(getType(newContext) === 'error') {
          console.log('error', newContext);
          return newContext;
        }

        // Continue re-invoking chain until its empty
        return invokeChain(chain, newContext);
      })
      .catch((err) => {
        console.error(`common/interpret ${fnName}: invokeFunction rejected`);
        // throw e;
        return createError(err, { name: fnName, context, args: fnArgs });
      });
    })
    .catch((err) => {
      console.error(`common/interpret ${fnName}: resolveArgs rejected`, err);
      // throw e;
      return createError(err, { name: fnName, context, args: fnArgs });
    });
  }

  function invokeFunction(name, context, args) {
    // Check function input.
    const fnDef = functions[name];
    const acceptableContext =  cast(context, fnDef.context.types);

    return fnDef.fn(acceptableContext, args, handlers)
    .then((output) => {
      // Validate that the function returned the type it said it would.
      // This isn't really required, but it keeps function developers honest.
      const returnType = getType(output);
      const expectedType = fnDef.type;
      if (expectedType && returnType !== expectedType) {
        throw new Error(`Function '${name}' should return '${expectedType}', actually returned '${returnType}'`);
      }

      // Validate the function output against the type definition's validate function
      const type = typesRegistry.get(fnDef.type);
      if (type && type.validate) {
        try {
          type.validate(output);
        } catch (e) {
          throw new Error(`Output of '${name}' is not a valid type '${fnDef.type}': ${e}`);
        }
      }

      return output;
    })
    .catch(err => createError(err, { name: fnDef.name, context, args }));
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  function resolveArgs(fnName, context, astArgs) {
    const fnDef = functions[fnName];
    const argDefs = fnDef.args;
    const nonAliasArgDefs = omitBy(argDefs, { isAlias: true });

    // Break this into keys and values, then recombine later.
    const nonAliasArgNames = keys(astArgs).map(argName => {
      if (!argDefs[argName]) throw new Error(`Unknown argument '${argName}' passed to function ${fnDef.name}()`);

      // This is where the alias gets turned into the actual name
      return argDefs[argName].name;
    });
    const multiValuedArgValues = values(astArgs);

    // Fill in defaults
    each(nonAliasArgDefs, (argDef, argName) => {
      if (nonAliasArgNames.includes(argName)) return;
      if (typeof argDef.default !== 'undefined') {
        nonAliasArgNames.push(argName);
        multiValuedArgValues.push([fromExpression(argDef.default, 'argument')]);
      }
    });

    // Create an array of promises, each representing 1 argument name
    const argListPromises = map(multiValuedArgValues, multiValueArg => {
      // Also an array of promises. Since each argument in the AST is multivalued each
      // argument value is an array. We use Promise.all to turn the values into a single promise.

      // Note that we're resolving the argument values before even looking up their definition
      return Promise.all(map(multiValueArg, argValue => interpret(argValue, null)));
    });


    return Promise.all(argListPromises)
    .then(resolvedArgs => zipObject(nonAliasArgNames, resolvedArgs)) // Recombine the keys
    .then(resolvedArgs => {
      return mapValues(resolvedArgs, (val, name) => {
        // TODO: Implement a system to allow for undeclared arguments
        const argDef = argDefs[name];
        if (!argDef) throw new Error(`Unknown argument to function: ${fnName}(${name})`);

        // Return an array for multi-valued arguments
        if (argDef.multi) {
          each(val, argValue => cast(argValue, argDef.types));
          return val;
        }

        // Otherwise return the final instance
        const argValue = last(val);
        return cast(argValue, argDef.types);
      });
    });
  }
}
