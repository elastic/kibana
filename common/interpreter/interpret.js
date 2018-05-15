import { each, keys, last, mapValues, values } from 'lodash';
import clone from 'lodash.clone';
import omitBy from 'lodash.omitby';
import { getType } from '../lib/get_type';
import { fromExpression } from '../lib/ast';
import { typesRegistry } from '../lib/types_registry';
import { castProvider } from './cast';

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
        return partialContext => invokeChain(node.chain, partialContext);
      case 'expression':
        return invokeChain(node.chain, context);
      case 'function':
        return node;
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
    const fnDef = functions[fnName];

    // if the function is not found, pass the expression chain to the not found handler
    // in this case, it will try to execute the function in another context
    if (!fnDef) {
      chain.unshift(link);
      return onFunctionNotFound({ type: 'expression', chain: chain }, context);
    }

    try {
      // Resolve arguments before passing to function
      const resolvedArgs = await resolveArgs(fnName, context, fnArgs);
      const newContext = await invokeFunction(fnName, context, resolvedArgs);

      // if something failed, just return the failure
      if (getType(newContext) === 'error') {
        console.log('newContext error', newContext);
        return newContext;
      }

      // Continue re-invoking chain until it's empty
      return await invokeChain(chain, newContext);
    } catch (err) {
      console.error(`common/interpret ${fnName}: invokeChain rejected`, err);
      return createError(err, { name: fnName, context, args: fnArgs });
    }
  }

  async function invokeFunction(name, context, args) {
    // Check function input.
    const fnDef = functions[name];
    const acceptableContext = cast(context, fnDef.context.types);
    const fnOutput = await fnDef.fn(acceptableContext, args, handlers);

    // Validate that the function returned the type it said it would.
    // This isn't really required, but it keeps function developers honest.
    const returnType = getType(fnOutput);
    const expectedType = fnDef.type;
    if (expectedType && returnType !== expectedType) {
      throw new Error(
        `Function '${name}' should return '${expectedType}',` + ` actually returned '${returnType}'`
      );
    }

    // Validate the function output against the type definition's validate function
    const type = typesRegistry.get(fnDef.type);
    if (type && type.validate) {
      try {
        type.validate(fnOutput);
      } catch (e) {
        throw new Error(`Output of '${name}' is not a valid type '${fnDef.type}': ${e}`);
      }
    }

    return fnOutput;
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  async function resolveArgs(fnName, context, astArgs) {
    const fnDef = functions[fnName];
    const argDefs = fnDef.args;
    const nonAliasArgDefs = omitBy(argDefs, { isAlias: true });

    // Break argument definitions into keys and values, then recombine later
    const multiValuedArgValues = values(astArgs);
    const nonAliasArgNames = keys(astArgs).map(argName => {
      if (!argDefs[argName]) {
        throw new Error(`Unknown argument '${argName}' passed to function '${fnDef.name}'`);
      }

      // This is where the alias gets turned into the actual name
      return argDefs[argName].name;
    });

    // Fill in default values from argument definition
    each(nonAliasArgDefs, (argDef, argName) => {
      if (nonAliasArgNames.includes(argName)) return;

      if (typeof argDef.default !== 'undefined') {
        nonAliasArgNames.push(argName);
        multiValuedArgValues.push([fromExpression(argDef.default, 'argument')]);
      }
    });

    // Create an array of promises, each representing 1 argument name
    const argListPromises = multiValuedArgValues.map(multiValueArg => {
      // Since each argument in the AST is multivalued, each argument value is an array
      // We use Promise.all to turn the values into a single promise
      // Note that we're resolving the argument values before even looking up their definition
      const argPromises = multiValueArg.map(argValue => interpret(argValue, context));
      return Promise.all(argPromises);
    });

    const argValues = await Promise.all(argListPromises);
    const resolvedArgs = nonAliasArgNames.reduce((args, argName, i) => {
      return {
        ...args,
        [argName]: (args[argName] || []).concat(argValues[i]),
      };
    }, {});

    return mapValues(resolvedArgs, (val, name) => {
      // TODO: Implement a system to allow for undeclared arguments
      const argDef = argDefs[name];
      if (!argDef) {
        throw new Error(`Unknown argument '${name}' passed to function '${fnName}'`);
      }

      // Return an array for multi-valued arguments
      if (argDef.multi) {
        return val.map(argValue => cast(argValue, argDef.types));
      }

      // Otherwise return the final instance
      return cast(last(val), argDef.types);
    });
  }
}
