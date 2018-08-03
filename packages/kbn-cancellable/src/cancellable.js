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

/**
 * Provides thin wrapper around a promise that allwos the promise chain
 * to be cancelled.
 */

/**
 * Creates a object that is used internally to the cancellable promise
 * to track the cancellation status and callbacks across the chain of promises.
 */
class CancellableState {
  constructor() {
    this.isCancelled = false;
    this.cancelHandlers = [];
  }

  /**
   * Adds a cancellation handler to the list of handlers. This
   * handler will be called once if the promise is ever cancelled,
   * regardless of whether or not the promise chain has passed
   * the place where the cancellation handler was declared.
   */
  addHandler(fn) {
    this.cancelHandlers.push(fn);
  }

  /**
   * Adds a reference to a nested cancellable, so that if the outer
   * cancellable is cancelled, the nested / child cancellable will
   * also be cancelled. (See the tests for an example of this.)
   */
  addChild(cancellable) {
    this.cancelHandlers.push((opts) => cancellable.cancel(opts));
  }

  /**
   * Cancels the promise chain and executes the handlers.
   *
   * @returns {Promise<void>}
   */
  async cancel() {
    if (this.isCancelled) {
      return;
    }

    this.isCancelled = true;
    for (const fn of this.cancelHandlers) {
      await fn();
    }
  }
}

/**
 * A lightweight wrapper around native promises that allows for cancellation.
 */
class Cancellable {

  /**
   * Creates an instance of Cancellable.
   *
   * @param {Promise} [promise] The promise being wrapped.
   * @memberof Cancellable
   */
  constructor(promise) {
    this._promise = promise || Promise.resolve();

    // We don't really want to expose this to the outside world, but
    // it's important that we share the same cancellable state between
    // all of our child promises, so we pass it as a hidden second param
    // to our constructor and use it if it's provided. If it's not provided,
    // the constructor is being called by an outsider.
    this._state = arguments[1] ? arguments[1] : new CancellableState();
  }

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param onfulfilled — The callback to execute when the Promise is resolved.
   * @param onrejected — The optional callback to execute when the Promise is rejected.
   * @returns — A Promise for the completion of which ever callback is executed.
   * @memberof Cancellable
   */
  then(onfulfilled, onrejected) {
    return new Cancellable(this._promise.then(this._wrap(onfulfilled, onrejected), onrejected), this._state);
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected — The callback to execute when the Promise is rejected.
   * @returns — A Promise for the completion of the callback.
   */
  catch(onrejected) {
    return new Cancellable(this._promise.catch(this._wrap(onrejected)), this._state);
  }

  /**
   * Attaches a callback for cancellation of the Promise.
   *
   * @param oncancelled - The callback to execute when the Promise is cancelled.
   * @returns - A Promise
   * @memberof Cancellable
   */
  cancelled(oncancelled) {
    this._state.addHandler(oncancelled);
    return this;
  }

  /**
   * Cancels the promise chain and waits for the cancellation callbacks to resolve.
   *
   * @memberof Cancellable
   */
  async cancel() {
    await this._state.cancel();
  }

  /**
   * Wraps the success / failure handlers with a function that understands cancellation
   * and skips further processing if the promise chain has been cancelled.
   */
  _wrap(success, failure) {
    return arg => {
      if (this._state.isCancelled) {
        const error = new Error('Promise cancelled');
        error.status = 'cancelled';
        if (failure) {
          return failure(error);
        }
        return error;
      }

      const result = success(arg);
      if (result && typeof result.cancel === 'function' && typeof result.then === 'function') {
        this._state.addChild(result);
      }
      return result;
    };
  }
}

module.exports = { Cancellable };
