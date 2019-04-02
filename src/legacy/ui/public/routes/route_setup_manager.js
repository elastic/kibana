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

import _ from 'lodash';

// Throw this inside of an Angular route resolver after calling `kbnUrl.change`
// so that the $router can observe the $location update. Otherwise, the location
// route setup work will resolve before the route update occurs.
export const WAIT_FOR_URL_CHANGE_TOKEN = new Error('WAIT_FOR_URL_CHANGE_TOKEN');

export class RouteSetupManager {
  constructor() {
    this.setupWork = [];
    this.onSetupComplete = [];
    this.onSetupError = [];
    this.onWorkComplete = [];
    this.onWorkError = [];
  }

  addSetupWork(fn) {
    this.setupWork.push(fn);
  }

  afterSetupWork(onComplete, onError) {
    this.onSetupComplete.push(onComplete);
    this.onSetupError.push(onError);
  }

  afterWork(onComplete, onError) {
    this.onWorkComplete.push(onComplete);
    this.onWorkError.push(onError);
  }

  /**
   * Do each setupWork function by injecting it with angular dependencies
   * and accepting promises from it.
   * @return {[type]} [description]
   */
  doWork(Promise, $injector, userWork) {

    const invokeEach = (arr, locals) => {
      return Promise.map(arr, fn => {
        if (!fn) return;
        return $injector.invoke(fn, null, locals);
      });
    };

    // call each error handler in order, until one of them resolves
    // or we run out of handlers
    const callErrorHandlers = (handlers, origError) => {
      if (!_.size(handlers)) throw origError;

      // clone so we don't discard handlers or loose them
      handlers = handlers.slice(0);

      const next = (err) => {
        if (!handlers.length) throw err;

        const handler = handlers.shift();
        if (!handler) return next(err);

        return Promise.try(function () {
          return $injector.invoke(handler, null, { err });
        }).catch(next);
      };

      return next(origError);
    };

    return invokeEach(this.setupWork)
      .then(
        () => invokeEach(this.onSetupComplete),
        err => callErrorHandlers(this.onSetupError, err)
      )
      .then(() => {
      // wait for the queue to fill up, then do all the work
        const defer = Promise.defer();
        userWork.resolveWhenFull(defer);

        return defer.promise.then(() => Promise.all(userWork.doWork()));
      })
      .catch(error => {
        if (error === WAIT_FOR_URL_CHANGE_TOKEN) {
        // prevent moving forward, return a promise that never resolves
        // so that the $router can observe the $location update
          return Promise.halt();
        }

        throw error;
      })
      .then(
        () => invokeEach(this.onWorkComplete),
        err => callErrorHandlers(this.onWorkError, err)
      );
  }
}
