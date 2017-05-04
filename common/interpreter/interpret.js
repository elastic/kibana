const _ = require('lodash');
const castProvider = require('./cast');
const getType = require('../types/get_type');

module.exports = (config) => {
  const cast = castProvider(config.types);
  const functions = config.functions;
  const onFunctionNotFound = config.onFunctionNotFound;

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
        return Promise.resolve(node.value);
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(node)}`);
    }
  }

  function invokeChain(chainArr, context) {
    if (!chainArr.length) return Promise.resolve(context);

    const chain = _.clone(chainArr);
    const link = chain.shift(); // Every think in the chain will always be a function right?
    const name = link.function;
    const args = link.arguments;

    const fnDef = functions.byName(name);
    if (!fnDef) {
      chain.unshift(link);
      return onFunctionNotFound({ type: 'expression', chain: chain }, context);
    }

    return resolveArgs(name, context, args) // Resolve arguments before passing to function
    .then(resolvedArgs =>
      invokeFunction(name, context, resolvedArgs) // Then invoke function with resolved arguments
      .then(newContext => invokeChain(chain, newContext)) // Continue re-invoking chain until its empty
      .catch(e => console.log('Function rejected', e)))
    .catch(e => console.log('Args rejected', e));
  }

  function invokeFunction(name, context, args) {
    // Check function input.
    const fnDef = functions.byName(name);
    const acceptableContext =  cast(context, fnDef.context.types);

    return fnDef.fn(acceptableContext, args).then(output => {
      // Validate that the function returned the type it said it would.
      // This is really required, but it keeps function developers honest.
      const returnType = getType(output);
      const expectedType = fnDef.type;
      if (returnType !== expectedType) {
        throw new Error(`Function ${name} should return '${expectedType}', actually returned '${returnType}'`);
      }

      return output;
    });
  }

  // Processes the multi-valued AST argument values into arguments that can be passed to the function
  function resolveArgs(fnName, context, astArgs) {
    const fnDef = functions.byName(fnName);

    // Because we don't have Promise.props, we break this into keys and values, then recombine later.
    const argNames = _.keys(astArgs);
    const multiValuedArgs = _.values(astArgs);

    // Create an array of promises, each representing 1 argument name
    const argListPromises = _.map(multiValuedArgs, multiValueArg => {
      // Also an array of promises. Since each argument in the AST is multivalued each
      // argument value is an array. We use Promise.all to turn the values into a single promise.
      return Promise.all(_.map(multiValueArg, argValue => interpret(argValue, context)));
    });

    return Promise.all(argListPromises)
    .then(resolvedArgs => _.zipObject(argNames, resolvedArgs)) // Recombine the keys
    .then(resolvedArgs => {
      const argDefs = fnDef.args;

      // Fill in defaults
      // This effectively means we simply ignore unknown arguments
      const args = _.mapValues(argDefs, (argDef, name) => {
        if (typeof resolvedArgs[name] !== 'undefined') return resolvedArgs[name];

        // Still treating everything as multivalued here
        if (typeof argDef.default !== 'undefined') return [argDef.default];
        return [null];
      });

      // Validate and normalize the argument values.
      return _.mapValues(args, (val, name) => {
        // TODO: Implement a system to allow for undeclared arguments
        const argDef = argDefs[name];
        if (!argDef) throw new Error(`Unknown argument to function: ${fnName}(${name})`);

        // Return an array for multi-valued arguments
        if (argDef.multi) {
          _.each(val, argValue => cast(argValue, argDef.types));
          return val;
        }

        // Otherwise return the final instance
        const argValue = _.last(val);
        console.log(name, argValue);
        return cast(argValue, argDef.types);
      });
    });
  }

  return interpret;
};
