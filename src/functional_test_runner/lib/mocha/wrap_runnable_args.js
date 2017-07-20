import { wrapFunction, wrapAsyncFunction } from './wrap_function';

/**
 *  Wraps a "runnable" defining function (it(), beforeEach(), etc.)
 *  so that any "runnable" arguments passed to it are wrapped and will
 *  trigger a lifecycle event if they throw an error.
 *
 *  @param  {Function} fn
 *  @param  {String} eventName
 *  @return {Function}
 */
export function wrapRunnableArgsWithErrorHandler(fn, handler) {
  return wrapFunction(fn, {
    before(target, thisArg, argumentsList) {
      for (let i = 0; i < argumentsList.length; i++) {
        if (typeof argumentsList[i] === 'function') {
          argumentsList[i] = wrapRunnableError(argumentsList[i], handler);
        }
      }
    }
  });
}

function wrapRunnableError(runnable, handler) {
  return wrapAsyncFunction(runnable, {
    async handleError(target, thisArg, argumentsList, err) {
      await handler(err, thisArg.test);
      throw err;
    }
  });
}
