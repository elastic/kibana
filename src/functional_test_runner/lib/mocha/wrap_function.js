
/**
 *  Get handler that will intercept calls to `toString`
 *  on the function, since Function.prototype.toString()
 *  does not like being called on Proxy objects
 *
 *  @param  {[type]} target   [description]
 *  @param  {[type]} property [description]
 *  @param  {[type]} receiver [description]
 *  @return {[type]}          [description]
 */
function commonGetHandler(target, property, receiver) {
  if (property === 'toString') {
    return (...args) => target.toString(...args);
  }

  return Reflect.get(target, property, receiver);
}

/**
 *  Wrap the execution of a function with a series of Hooks
 *
 *  @param  {Function} fn
 *  @param  {Object} [hooks={}]
 *  @property {Function} hooks.before
 *  @property {Function} hooks.after
 *  @return {Any}
 */
export function wrapFunction(fn, hooks = {}) {
  return new Proxy(fn, {
    get: commonGetHandler,
    apply(target, thisArg, argumentsList) {
      try {
        if (hooks.before) {
          hooks.before(target, thisArg, argumentsList);
        }
        return Reflect.apply(target, thisArg, argumentsList);
      } finally {
        if (hooks.after) {
          hooks.after(target, thisArg, argumentsList);
        }
      }
    }
  });
}

/**
 *  Wrap the execution of an async function with a series of Hooks
 *
 *  @param  {AsyncFunction} fn
 *  @param  {Object} [hooks={}]
 *  @property {AsyncFunction} hooks.before
 *  @property {AsyncFunction} hooks.handleError
 *  @property {AsyncFunction} hooks.after
 *  @return {Any}
 */
export function wrapAsyncFunction(fn, hooks = {}) {
  return new Proxy(fn, {
    get: commonGetHandler,
    async apply(target, thisArg, argumentsList) {
      try {
        if (hooks.before) {
          await hooks.before(target, thisArg, argumentsList);
        }

        return await Reflect.apply(target, thisArg, argumentsList);
      } catch (err) {
        if (hooks.handleError) {
          return await hooks.handleError(target, thisArg, argumentsList, err);
        }

        throw err;
      } finally {
        if (hooks.after) {
          await hooks.after(target, thisArg, argumentsList);
        }
      }
    }
  });
}
